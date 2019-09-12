/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { curry } from 'lodash';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { nullableType } from './lib/nullable';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

// config definition
enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const configSchemaProps = {
  url: schema.string(),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: nullableType(HeadersSchema),
};
const ConfigSchema = schema.object(configSchemaProps);
type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const SecretsSchema = schema.object({
  user: schema.string(),
  password: schema.string(),
});

// params definition
type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

// action type definition
export function getActionType(configurationUtilities: ActionsConfigurationUtilities): ActionType {
  return {
    id: '.webhook',
    name: 'webhook',
    validate: {
      config: schema.object(configSchemaProps, {
        validate: curry(valdiateActionTypeConfig)(configurationUtilities),
      }),
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    executor: curry(executor)(configurationUtilities),
  };
}

function valdiateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
) {
  try {
    configurationUtilities.ensureWhitelistedUri(configObject.url);
  } catch (whitelistError) {
    return i18n.translate('xpack.actions.builtin.webhook.webhookConfigurationError', {
      defaultMessage: 'error configuring webhook action: {message}',
      values: {
        message: whitelistError.message,
      },
    });
  }
}

// action executor
export async function executor(
  configurationUtilities: ActionsConfigurationUtilities,
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
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
    log('debug', `response from webhook action "${id}": [HTTP ${status}] ${statusText}`);

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
        return pipe(
          getRetryAfterIntervalFromHeaders(responseHeaders),
          map(retry => retryResultSeconds(id, message, retry)),
          getOrElse(() => retryResult(id, message))
        );
      }
      return errorResultInvalid(id, message);
    }

    const message = i18n.translate('xpack.actions.builtin.webhook.unreachableRemoteWebhook', {
      defaultMessage: 'Unreachable Remote Webhook, are you sure the address is correct?',
    });
    log(`warn`, `error on ${id} webhook action: ${message}`);
    return errorResultUnreachable(id, message);
  }
}

// Action Executor Result w/ internationalisation
function successResult(data: any): ActionTypeExecutorResult {
  return { status: 'ok', data };
}

function errorResultInvalid(id: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.webhook.invalidResponseErrorMessage', {
    defaultMessage:
      'Invalid Response: an error occurred in webhook action "{id}" calling a remote webhook: {message}',
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
    defaultMessage:
      'Unreachable Webhook: an error occurred in webhook action "{id}" calling a remote webhook: {message}',
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
      defaultMessage:
        'Invalid Response: an error occurred in webhook action "{id}" calling a remote webhook, retry later',
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
        'Invalid Response: an error occurred in webhook action "{id}" calling a remote webhook, retry at {retryString}: {message}',
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
