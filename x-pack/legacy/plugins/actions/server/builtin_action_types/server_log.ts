/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

const DEFAULT_TAGS = ['info', 'alerting'];

// config definition

const unencryptedConfigProperties: string[] = [];

const ConfigSchema = schema.object({});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: DEFAULT_TAGS }),
});

// action type definition

export const actionType: ActionType = {
  id: '.server-log',
  name: 'server-log',
  unencryptedAttributes: unencryptedConfigProperties,
  validate: {
    config: ConfigSchema,
    params: ParamsSchema,
  },
  executor,
};

// action executor

async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const params = execOptions.params as ActionParamsType;
  const services = execOptions.services;

  try {
    services.log(params.tags, params.message);
  } catch (err) {
    return {
      status: 'error',
      message: `error logging message: ${err.message}`,
    };
  }

  return { status: 'ok' };
}
