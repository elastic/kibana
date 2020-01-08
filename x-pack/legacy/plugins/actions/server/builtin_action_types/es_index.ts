/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { nullableType } from './lib/nullable';
import { Logger } from '../../../../../../src/core/server';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// config definition

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchema = schema.object({
  index: nullableType(schema.string()),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

// see: https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-index.html
// - timeout not added here, as this seems to be a generic thing we want to do
//   eventually: https://github.com/elastic/kibana/projects/26#card-24087404
const ParamsSchema = schema.object({
  index: schema.maybe(schema.string()),
  executionTimeField: schema.maybe(schema.string()),
  refresh: schema.maybe(schema.boolean()),
  documents: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
});

// action type definition
export function getActionType({ logger }: { logger: Logger }): ActionType {
  return {
    id: '.index',
    name: 'index',
    validate: {
      config: ConfigSchema,
      params: ParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const config = execOptions.config as ActionTypeConfigType;
  const params = execOptions.params as ActionParamsType;
  const services = execOptions.services;

  if (config.index == null && params.index == null) {
    const message = i18n.translate('xpack.actions.builtin.esIndex.indexParamRequiredErrorMessage', {
      defaultMessage: 'index param needs to be set because not set in config for action',
    });
    return {
      status: 'error',
      actionId,
      message,
    };
  }

  if (config.index != null && params.index != null) {
    logger.debug(`index passed in params overridden by index set in config for action ${actionId}`);
  }

  const index = config.index || params.index;

  const bulkBody = [];
  for (const document of params.documents) {
    if (params.executionTimeField != null) {
      document[params.executionTimeField] = new Date();
    }

    bulkBody.push({ index: {} });
    bulkBody.push(document);
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
    const message = i18n.translate('xpack.actions.builtin.esIndex.errorIndexingErrorMessage', {
      defaultMessage: 'error indexing documents',
    });
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  return { status: 'ok', data: result, actionId };
}
