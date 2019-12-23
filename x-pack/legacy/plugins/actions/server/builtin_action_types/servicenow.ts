/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { postServiceNow } from './lib/post_servicenow';

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
  username: schema.string(),
};

const SecretsSchema = schema.object(SecretsSchemaProps);

function validateSecrets(
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: SecretsType
) {
  if (secrets.username == null) {
    return i18n.translate('xpack.actions.builtin.servicenow.servicenowApiUserError', {
      defaultMessage: 'error configuring servicenow action: no secrets [username] provided',
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

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  let response;
  try {
    response = await postServiceNow({ apiUrl: config.apiUrl, data: params, headers, secrets });
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.servicenow.postingErrorMessage', {
      defaultMessage: 'error posting servicenow event',
    });
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }
  if (response.status === 201) {
    return {
      status: 'ok',
      actionId,
      data: response.data,
    };
  }

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.translate('xpack.actions.builtin.servicenow.postingRetryErrorMessage', {
      defaultMessage: 'error posting servicenow event: http status {status}, retry later',
      values: {
        status: response.status,
      },
    });

    return {
      status: 'error',
      actionId,
      message,
      retry: true,
    };
  }

  const message = i18n.translate('xpack.actions.builtin.servicenow.postingUnexpectedErrorMessage', {
    defaultMessage: 'error posting servicenow event: unexpected status {status}',
    values: {
      status: response.status,
    },
  });

  return {
    status: 'error',
    actionId,
    message,
  };
}
