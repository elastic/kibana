/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { nullableType } from './lib/nullable';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

const PORT_MAX = 256 * 256 - 1;

// config definition
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const ConfigSchema = schema.object({
  host: schema.string(),
  port: schema.number({ min: 1, max: PORT_MAX }),
  scheme: schema.oneOf([schema.literal('http'), schema.literal('https')], {
    defaultValue: 'http',
  }),
  method: schema.oneOf(
    [
      schema.literal('head'),
      schema.literal('get'),
      schema.literal('post'),
      schema.literal('put'),
      schema.literal('delete'),
    ],
    {
      defaultValue: 'get',
    }
  ),
  path: nullableType(schema.string()),
  headers: nullableType(HeadersSchema),
});

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const SecretsSchema = schema.object({
  username: schema.string(),
  password: schema.string(),
});

// action type definition
export const actionType: ActionType = {
  id: '.webhook',
  name: 'webhook',
  validate: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  executor,
};

// action executor
async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  return {
    status: 'error',
  };
}
