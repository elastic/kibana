/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf, Type } from '@kbn/config-schema';

import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

function nullableType<V>(type: Type<V>) {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: () => null });
}

// config definition

const unencryptedConfigProperties: string[] = ['index'];

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchema = schema.object({
  index: nullableType(schema.string()),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const IndexSingleBodySchema = schema.recordOf(schema.string(), schema.any());
const IndexArrayBodySchema = schema.arrayOf(IndexSingleBodySchema);
const IndexBodySchema = schema.oneOf([IndexSingleBodySchema, IndexArrayBodySchema]);

type IndexArrayBodySchemaType = TypeOf<typeof IndexArrayBodySchema>;

// see: https://www.elastic.co/guide/en/elastic-stack-overview/current/actions-index.html
// - timeout not added here, as this seems to be a generic thing we want to do
//   eventually: https://github.com/elastic/kibana/projects/26#card-24087404
const ParamsSchema = schema.object({
  index: schema.maybe(schema.string()),
  doc_id: schema.maybe(schema.string()),
  execution_time_field: schema.maybe(schema.string()),
  refresh: schema.maybe(schema.boolean()),
  body: IndexBodySchema,
});

// action type definition

export const actionType: ActionType = {
  id: '.index',
  name: 'index',
  unencryptedAttributes: unencryptedConfigProperties,
  validate: {
    config: ConfigSchema,
    params: ParamsSchema,
  },
  executor,
};

// action executor

async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const id = execOptions.id;
  const config = execOptions.config as ActionTypeConfigType;
  const params = execOptions.params as ActionParamsType;
  const services = execOptions.services;

  if (config.index == null && params.index == null) {
    return {
      status: 'error',
      message: `index param needs to be set because not set in config for action ${id}`,
    };
  }

  if (config.index != null && params.index != null) {
    services.log(
      ['debug', 'actions'],
      `index passed in params overridden by index set in config for action ${id}`
    );
  }

  const index = config.index || params.index;

  let bodies: IndexArrayBodySchemaType = [];
  let actions: any[] = [];

  if (Array.isArray(params.body)) {
    bodies = params.body;
    actions = [];
    for (let i = 0; i < bodies.length; i++) {
      actions.push({ index: {} });
    }
  } else {
    bodies = [params.body];
    actions = [{ index: {} }];

    if (params.doc_id != null) {
      actions[0]._id = params.doc_id;
    }
  }

  for (const body of bodies) {
    if (params.execution_time_field != null) {
      body[params.execution_time_field] = new Date();
    }
  }

  const bulkBody = [];
  for (let i = 0; i < bodies.length; i++) {
    bulkBody.push(actions[i]);
    bulkBody.push(bodies[i]);
  }

  const bulkParams: any = {
    index,
    body: bulkBody,
  };

  if (params.refresh != null) {
    bulkParams.refresh = params.refresh;
  }

  let result;
  try {
    result = await services.callCluster('bulk', bulkParams);
  } catch (err) {
    return {
      status: 'error',
      message: `error in action ${id} indexing documents: ${err.message}`,
    };
  }

  return { status: 'ok', data: result };
}
