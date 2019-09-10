/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { nullableType } from './lib/nullable';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';

// config definition
enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}

export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());

const ConfigSchema = schema.object({
  url: schema.string(),
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

// action executor
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
      url,
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
        return retryResult(id, message);
      }

      // special handling for rate limiting
      if (status === 429) {
        return getRetryAfterIntervalFromHeaders(responseHeaders)
          .map(retry => retryResultSeconds(id, message, retry))
          .getOrElse(retryResult(id, message));
      }
      return errorResultInvalid(id, message);
    }

    const message = i18n.translate('xpack.actions.builtin.webhook.unreachableRemoteWebhook', {
      defaultMessage: 'Unreachable Remote Webhook, are you sure the address is correct?',
    });
    log(`warn`, `error on ${id} webhook event: ${message}`);
    return errorResultUnreachable(id, message);
  }
}

// Action Executor Result w/ internationalisation
function successResult(data: any): ActionTypeExecutorResult {
  return { status: 'ok', data };
}

function errorResultInvalid(id: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'an error occurred in action "{id}" calling a remote webhook: {message}',
    values: {
      id,
      message,
    },
  });
  return {
    status: 'error',
    message: errMessage,
  };
}

function errorResultUnreachable(id: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.webhook.unreachableErrorMessage', {
    defaultMessage: 'an error occurred in action "{id}" calling a remote webhook: {message}',
    values: {
      id,
      message,
    },
  });
  return {
    status: 'error',
    message: errMessage,
  };
}

function retryResult(id: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.webhook.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'an error occurred in action "{id}" calling a remote webhook, retry later',
      values: {
        id,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
  };
}

function retryResultSeconds(
  id: string,
  message: string,

  retryAfter: number
): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.webhook.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage:
        'an error occurred in action "{id}" calling a remote webhook, retry at {retryString}: {message}',
      values: {
        id,
        retryString,
        message,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry,
  };
}
