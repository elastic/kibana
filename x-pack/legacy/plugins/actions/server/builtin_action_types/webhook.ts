/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { nullableType } from './lib/nullable';
import { portSchema } from './lib/schemas';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// config definition
enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}
enum WebhookSchemes {
  HTTP = 'http',
  HTTPS = 'https',
}

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());

export const CompositeUrlSchema = schema.object({
  host: schema.string(),
  port: portSchema(),
  path: nullableType(schema.string()),
  scheme: schema.oneOf(
    [schema.literal(WebhookSchemes.HTTP), schema.literal(WebhookSchemes.HTTPS)],
    {
      defaultValue: WebhookSchemes.HTTP,
    }
  ),
});

const ConfigSchema = schema.object({
  url: schema.oneOf([schema.string(), CompositeUrlSchema]),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: nullableType(HeadersSchema),
});

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

function asComposedUrl(url: string | TypeOf<typeof CompositeUrlSchema>): string {
  if (typeof url === 'string') {
    return url;
  }
  return `${url.scheme}://${url.host}${url.port ? `:${url.port}` : ''}${url.path || ''}`;
}

function describeWebhookErrorSource(error: AxiosError): string {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return `remote webhook failure`;
  } else if (error.request) {
    // The request was made but no response was received
    return `unreachable remote webhook`;
  }
  return `unknown webhook event`;
}

// action executor
async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const log = (msg: string) => execOptions.services.log(['warn', 'actions', 'webhook'], msg);

  const id = execOptions.id;
  const { method, url, headers = {} } = execOptions.config as ActionTypeConfigType;
  const { user: username, password } = execOptions.secrets as ActionTypeSecretsType;
  const { body: data } = execOptions.params as ActionParamsType;

  const result: Result<AxiosResponse, AxiosError> = await promiseResult(
    axios.request({
      method,
      url: asComposedUrl(url),
      auth: {
        username,
        password,
      },
      headers,
      data,
    })
  );

  if (isOk(result)) {
    const { value: response } = result;
    log(`response from ${id} webhook event: ${response.status}`);

    if (response.status >= 200 && response.status < 300) {
      return {
        status: 'ok',
        data: response.data,
      };
    } else {
      return {
        status: 'error',
        message: `an http error ${response.status} occurred in action "${id}", due to an unknown webhook event`,
        data: response.data,
      };
    }
  } else {
    const { error } = result;
    const message = i18n.translate('xpack.actions.builtin.webhook.postingErrorMessage', {
      defaultMessage: `error in action "{id}", due to {eventSource}: {errorMessage}`,
      values: {
        id,
        eventSource: describeWebhookErrorSource(error),
        errorMessage: error.message,
      },
    });
    log(`error on ${id} webhook event: ${error.message}`);
    return {
      status: 'error',
      message,
    };
  }
}
