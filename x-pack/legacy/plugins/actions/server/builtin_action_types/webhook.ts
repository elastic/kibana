/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { nullableType } from './lib/nullable';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { assertValidInterval } from '../../../task_manager/lib/intervals';

// Generic Schemas
const PORT_MAX = 256 * 256 - 1;
const PortSchema = schema.number({ min: 1, max: PORT_MAX });

// config definition
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const ProxySchema = schema.object({
  host: schema.string(),
  port: nullableType(PortSchema),
});

const ConfigSchema = schema.object(
  {
    host: schema.string(),
    port: PortSchema,
    scheme: schema.oneOf([schema.literal('http'), schema.literal('https')], {
      defaultValue: 'http',
    }),
    method: schema.oneOf([schema.literal('post'), schema.literal('put')], {
      defaultValue: 'post',
    }),
    path: nullableType(schema.string()),
    url: nullableType(schema.string()),
    headers: nullableType(HeadersSchema),
    proxy: nullableType(ProxySchema),
    connection_timeout: nullableType(schema.string()),
    read_timeout: nullableType(schema.string()),
  },
  { validate: validateConfig }
);

function validateConfig(configObject: any): string | void {
  const config: ActionTypeConfigType = configObject;

  const { read_timeout: readTimeout, connection_timeout: connectionTimeout } = config;
  try {
    if (readTimeout != null) {
      assertValidInterval(readTimeout);
    }
  } catch (e) {
    return `[read_timeout]: ${e.message}`;
  }
  try {
    if (connectionTimeout != null) {
      assertValidInterval(connectionTimeout);
    }
  } catch (e) {
    return `[connection_timeout]: ${e.message}`;
  }
}

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const SecretsSchema = schema.object({
  user: schema.string(),
  password: schema.string(),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

// action type definition
export const actionType: ActionType = {
  id: '.webhook',
  name: 'webhook',
  validate: {
    config: ConfigSchema,
    secrets: SecretsSchema,
    params: ParamsSchema,
  },
  executor,
};

// action executor
async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  return {
    status: 'error',
  };
}
