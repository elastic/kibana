/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { nullableType } from './lib/nullable';
import { portSchema } from './lib/schemas';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import {
  successResult,
  errorResult,
  retryResult,
  retryResultSeconds,
  getRetryAfterIntervalFromHeaders,
} from './lib/action_executor_result';

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

// action executor
const ACTION_DESCRIPTION = 'calling a remote webhook';
enum ACTION_I18N_IDENTIFIERS {
  INVALID_RESPONSE_ERROR = 'webhook.invalidResponseErrorMessage',
  INVALID_RESPONSE_RETRY_LATER_ERROR = 'webhook.invalidResponseRetryLaterErrorMessage',
  INVALID_RESPONSE_RETRY_LATER_DATE_ERROR = 'webhook.invalidResponseRetryDateErrorMessage',
  UNREACHABLE_ERROR = 'webhook.unreachableErrorMessage',
}

async function executor(execOptions: ActionTypeExecutorOptions): Promise<ActionTypeExecutorResult> {
  const log = (level: string, msg: string) =>
    execOptions.services.log([level, 'actions', 'webhook'], msg);

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
    const {
      value: { status, statusText },
    } = result;
    log('debug', `response from ${id} webhook event: [HTTP ${status}] ${statusText}`);

    return successResult(data);
  } else {
    const { error } = result;

    if (error.response) {
      const { status, statusText, headers: responseHeaders } = error.response;
      const message = `[${status}] ${statusText}`;
      log(`warn`, `error on ${id} webhook event: ${message}`);
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // special handling for 5xx
      if (status >= 500) {
        return retryResult(
          id,
          message,
          ACTION_DESCRIPTION,
          ACTION_I18N_IDENTIFIERS.INVALID_RESPONSE_RETRY_LATER_ERROR
        );
      }

      // special handling for rate limiting
      if (status === 429) {
        return retryResultSeconds(
          id,
          message,
          ACTION_DESCRIPTION,
          ACTION_I18N_IDENTIFIERS.INVALID_RESPONSE_RETRY_LATER_DATE_ERROR,
          getRetryAfterIntervalFromHeaders(responseHeaders)
        );
      }
      return errorResult(
        id,
        message,
        ACTION_DESCRIPTION,
        ACTION_I18N_IDENTIFIERS.INVALID_RESPONSE_ERROR
      );
    }

    const message = i18n.translate(`xpack.actions.builtin.webhook.unreachableRemoteWebhook`, {
      defaultMessage: 'Unreachable Remote Webhook, are you sure the address is correct?',
    });
    log(`warn`, `error on ${id} webhook event: ${message}`);
    return errorResult(id, message, ACTION_DESCRIPTION, ACTION_I18N_IDENTIFIERS.UNREACHABLE_ERROR);
  }
}
