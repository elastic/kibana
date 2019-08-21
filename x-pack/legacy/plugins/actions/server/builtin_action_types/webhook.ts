/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { nullableType } from './lib/nullable';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { assertValidInterval } from '../../../task_manager/lib/intervals';

// Generic Schemas
const PORT_MAX = 256 * 256 - 1;
const PortSchema = schema.number({ min: 1, max: PORT_MAX });

enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}
enum WebhookSchemes {
  HTTP = 'http',
  HTTPS = 'https',
}

// config definition
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const ProxySchema = schema.object({
  host: schema.string(),
  port: nullableType(PortSchema),
});

export const CompositeUrlSchema = schema.object({
  host: schema.string(),
  port: PortSchema,
  path: nullableType(schema.string()),
  scheme: schema.oneOf(
    [schema.literal(WebhookSchemes.HTTP), schema.literal(WebhookSchemes.HTTPS)],
    {
      defaultValue: WebhookSchemes.HTTP,
    }
  ),
});

const ConfigSchema = schema.object(
  {
    url: schema.oneOf([schema.string(), CompositeUrlSchema]),
    method: schema.oneOf(
      [schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)],
      {
        defaultValue: WebhookMethods.POST,
      }
    ),
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

function flatterUrl(url: string | TypeOf<typeof CompositeUrlSchema>): string {
  if (typeof url === 'string') {
    return url;
  }
  return `${url.scheme}://${url.host}${url.port ? `:${url.port}` : ''}${url.path || ''}`;
}

// action executor
async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const log = (msg: string) => execOptions.services.log(['warn', 'actions', 'webhook'], msg);

  const id = execOptions.id;
  const { method, url, headers = {} } = execOptions.config as ActionTypeConfigType;
  const { user: username, password } = execOptions.secrets as ActionTypeSecretsType;
  const { body: data } = execOptions.params as ActionParamsType;

  let response;
  try {
    response = await axios.request({
      method,
      url: flatterUrl(url),
      auth: {
        username,
        password,
      },
      headers,
      data,
    });
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.webhook.postingErrorMessage', {
      defaultMessage: `error in action "{id}" webhook event: {errorMessage}`,
      values: {
        id,
        errorMessage: err.message,
      },
    });
    log(`error on ${id} webhook event: ${err.message}`);
    return {
      status: 'error',
      message,
    };
  }

  log(`response from ${id} webhook event: ${response.status}`);

  if (response.status === 200) {
    return {
      status: 'ok',
      data: response.data,
    };
  }

  return {
    status: 'error',
  };
}
