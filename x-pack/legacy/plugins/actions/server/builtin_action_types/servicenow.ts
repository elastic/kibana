/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@serviceNow/webhook';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';

import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

// config definition
export type ConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchemaProps = {
  apiUrl: schema.string(),
};

const ConfigSchema = schema.object(ConfigSchemaProps);

function validateConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ConfigType
) {
  if (configObject.apiUrl == null) {
    return i18n.translate('xpack.actions.builtin.servicenow.servicenowApiNullError', {
      defaultMessage: 'ServiceNow [apiUrl] is required',
    });
  }
  try {
    configurationUtilities.ensureWhitelistedUri(configObject.apiUrl);
  } catch (whitelistError) {
    return i18n.translate('xpack.actions.builtin.servicenow.servicenowApiWhitelistError', {
      defaultMessage: 'error configuring servicenow action: {message}',
      values: {
        message: whitelistError.message,
      },
    });
  }
}
// secrets definition
export type SecretsType = TypeOf<typeof SecretsSchema>;
const SecretsSchemaProps = {
  password: schema.string(),
  user: schema.string(),
};

const SecretsSchema = schema.object(SecretsSchemaProps);

function validateSecrets(
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: SecretsType
) {
  if (secrets.user == null) {
    return i18n.translate('xpack.actions.builtin.servicenow.servicenowApiUserError', {
      defaultMessage: 'error configuring servicenow action: no secrets [user] provided',
    });
  }
  if (secrets.password == null) {
    return i18n.translate('xpack.actions.builtin.servicenow.servicenowApiUserError', {
      defaultMessage: 'error configuring servicenow action: no secrets [password] provided',
    });
  }
}

// params definition

export type ParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  comments: schema.string(),
  short_description: schema.string(),
});

// action type definition
export function getActionType({
  configurationUtilities,
  executor = serviceNowExecutor,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  executor?: ExecutorType;
}): ActionType {
  return {
    id: '.servicenow',
    name: 'servicenow',
    validate: {
      config: schema.object(ConfigSchemaProps, {
        validate: curry(validateConfig)(configurationUtilities),
      }),
      secrets: schema.object(SecretsSchemaProps, {
        validate: curry(validateSecrets)(configurationUtilities),
      }),
      params: ParamsSchema,
    },
    executor,
  };
}

// action executor

async function serviceNowExecutor(
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const config = execOptions.config as ConfigType;
  const secrets = execOptions.secrets as SecretsType;
  const params = execOptions.params as ParamsType;

  let result: IncomingWebhookResult;
  const { apiUrl } = config;
  const { user, password } = secrets;
  const { comments, short_description } = params;
  const headers = {
    'Content-Type': 'application/json',
  };
  console.log('HOORAYHOORAYHOORAY WE ARE HERE!')
  return 'HOORAY WE ARE HERE!';

  //
  //
  // try {
  //   const webhook = new IncomingWebhook(apiUrl);
  //   result = await webhook.send(message);
  // } catch (err) {
  //   if (err.original == null || err.original.response == null) {
  //     return serviceErrorResult(actionId, err.message);
  //   }
  //
  //   const { status, statusText, headers } = err.original.response;
  //
  //   // special handling for 5xx
  //   if (status >= 500) {
  //     return retryResult(actionId, err.message);
  //   }
  //
  //   // special handling for rate limiting
  //   if (status === 429) {
  //     return pipe(
  //       getRetryAfterIntervalFromHeaders(headers),
  //       map(retry => retryResultSeconds(actionId, err.message, retry)),
  //       getOrElse(() => retryResult(actionId, err.message))
  //     );
  //   }
  //
  //   const errMessage = i18n.translate(
  //     'xpack.actions.builtin.serviceNow.unexpectedHttpResponseErrorMessage',
  //     {
  //       defaultMessage: 'unexpected http response from serviceNow: {httpStatus} {httpStatusText}',
  //       values: {
  //         httpStatus: status,
  //         httpStatusText: statusText,
  //       },
  //     }
  //   );
  //   return errorResult(actionId, errMessage);
  // }
  //
  // if (result == null) {
  //   const errMessage = i18n.translate(
  //     'xpack.actions.builtin.serviceNow.unexpectedNullResponseErrorMessage',
  //     {
  //       defaultMessage: 'unexpected null response from serviceNow',
  //     }
  //   );
  //   return errorResult(actionId, errMessage);
  // }
  //
  // if (result.text !== 'ok') {
  //   return serviceErrorResult(actionId, result.text);
  // }
  //
  // return successResult(actionId, result);
}

function successResult(actionId: string, data: any): ActionTypeExecutorResult {
  return { status: 'ok', data, actionId };
}

function errorResult(actionId: string, message: string): ActionTypeExecutorResult {
  return {
    status: 'error',
    message,
    actionId,
  };
}
function serviceErrorResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.serviceNow.errorPostingErrorMessage', {
    defaultMessage: 'error posting serviceNow message',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function retryResult(actionId: string, message: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.serviceNow.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a serviceNow message, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
  };
}

function retryResultSeconds(
  actionId: string,
  message: string,
  retryAfter: number
): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.serviceNow.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a serviceNow message, retry at {retryString}',
      values: {
        retryString,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry,
    actionId,
    serviceMessage: message,
  };
}
