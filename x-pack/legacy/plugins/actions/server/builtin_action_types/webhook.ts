/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { URL } from 'url';
import Boom from 'boom';
import { Option, fromNullable } from 'fp-ts/lib/Option';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { nullableType } from './lib/nullable';
import { isOk, promiseResult, Result } from './lib/result_type';
import {
  ConfigureableActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ActionType,
} from '../types';

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
export type ActionTypeConfigType = TypeOf<typeof UnvalidatedConfigSchema>;
const UnvalidatedConfigSchema = schema.object(configSchemaProps);

export type WebhookActionKibanaConfig = TypeOf<typeof ActionTypeConfigSchema>;
const ActionTypeConfigSchema = schema.object({
  whitelistedEndpoints: schema.oneOf([schema.arrayOf(schema.string()), schema.literal('any')]),
});

function asArray(list: string | string[]): string[] {
  return Array.isArray(list) ? list : [list];
}

export function validateConfig(
  kibanaConfig: Option<WebhookActionKibanaConfig>
): (configObject: any) => string | void {
  try {
    kibanaConfig.map(config => ActionTypeConfigSchema.validate(config));
  } catch (err) {
    throw Boom.badRequest(
      `error validating the Webhook Action Kiabana configuration: ${err.message} ${JSON.stringify(
        kibanaConfig
      )}`
    );
  }
  return configObject => {
    const { url }: ActionTypeConfigType = configObject;

    const anyUrlAllowed = kibanaConfig
      .map(({ whitelistedEndpoints }) => whitelistedEndpoints === 'any')
      .getOrElse(false);

    if (!anyUrlAllowed) {
      const urlHostname = new URL(url).hostname;
      const isWhitelisted = kibanaConfig
        .map(({ whitelistedEndpoints }) => {
          return fromNullable(
            asArray(whitelistedEndpoints).find(
              whitelistedUrl => parseWhitelistURL(whitelistedUrl) === urlHostname
            )
          ).isSome();
        })
        .getOrElse(false);

      if (!isWhitelisted) {
        return i18n.translate(
          'xpack.actions.builtin.webhook.unwhitelistedWebhookConfigurationError',
          {
            defaultMessage:
              'an error occurred configuring webhook with unwhitelisted target url "{url}"',
            values: {
              url,
            },
          }
        );
      }
    }
  };
}

function parseWhitelistURL(whitelistedUrl: string): string {
  try {
    return new URL(whitelistedUrl).hostname;
  } catch (e) {
    // if we can't parse the URL assume that it is specifying the hostname itself
    return whitelistedUrl;
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
export const actionType: ConfigureableActionType<WebhookActionKibanaConfig> = {
  id: '.webhook',
  name: 'webhook',
  configure: configureActionType,
};

function configureActionType(kibanaConfig: Option<WebhookActionKibanaConfig>): ActionType {
  const ConfigSchema = schema.object(configSchemaProps, {
    validate: validateConfig(kibanaConfig),
  });
  return {
    ...actionType,
    validate: {
      config: ConfigSchema,
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    executor,
  };
}

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
