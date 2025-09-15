/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AxiosError, AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
import { pipe } from 'fp-ts/pipeable';
import { map, getOrElse } from 'fp-ts/Option';
import type {
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { SSLCertType } from '../../../common/auth/constants';
import type {
  WebhookConnectorType,
  ActionParamsType,
  ConnectorTypeConfigType,
  WebhookConnectorTypeExecutorOptions,
} from './types';

import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import type { Result } from '../lib/result_type';
import { isOk, promiseResult } from '../lib/result_type';
import { ConfigSchema, ParamsSchema } from './schema';
import { SecretConfigurationSchema } from '../../../common/auth/schema';
import { AuthType } from '../../../common/auth/constants';
import { getAxiosConfig } from './get_axios_config';
import { ADDITIONAL_FIELD_CONFIG_ERROR } from './translations';

export const ConnectorTypeId = '.webhook';

// connector type definition
export function getConnectorType(): WebhookConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.webhook.title', {
      defaultMessage: 'Webhook',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateConnectorTypeConfig,
      },
      secrets: {
        schema: SecretConfigurationSchema,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    renderParameterTemplates,
    executor,
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  if (!params.body) return params;
  return {
    body: renderMustacheString(logger, params.body, variables, 'json'),
  };
}

function validateUrl(configuredUrl: string) {
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.configurationErrorNoHostname', {
        defaultMessage: 'error validation webhook action config: unable to parse url: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
}

function ensureUriAllowed(
  configuredUrl: string,
  configurationUtilities: ActionsConfigurationUtilities
) {
  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.configurationError', {
        defaultMessage: 'error validation webhook action config: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

function validateAuthType(configObject: ConnectorTypeConfigType) {
  if (Boolean(configObject.authType) && !configObject.hasAuth) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.authConfigurationError', {
        defaultMessage:
          'error validation webhook action config: authType must be null or undefined if hasAuth is false',
      })
    );
  }
}

function validateCertType(
  configObject: ConnectorTypeConfigType,
  configurationUtilities: ActionsConfigurationUtilities
) {
  if (configObject.certType === SSLCertType.PFX) {
    const webhookSettings = configurationUtilities.getWebhookSettings();
    if (!webhookSettings.ssl.pfx.enabled) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.webhook.pfxConfigurationError', {
          defaultMessage:
            'error validation webhook action config: certType "{certType}" is disabled',
          values: {
            certType: SSLCertType.PFX,
          },
        })
      );
    }
  }
}

function validateAdditionalFields(configObject: ConnectorTypeConfigType) {
  if (configObject.additionalFields) {
    try {
      const parsedAdditionalFields = JSON.parse(configObject.additionalFields);

      if (
        typeof parsedAdditionalFields !== 'object' ||
        Array.isArray(parsedAdditionalFields) ||
        Object.keys(parsedAdditionalFields).length === 0
      ) {
        throw new Error(ADDITIONAL_FIELD_CONFIG_ERROR);
      }
    } catch (e) {
      throw new Error(ADDITIONAL_FIELD_CONFIG_ERROR);
    }
  }
}

function validateOAuth2(configObject: ConnectorTypeConfigType) {
  if (
    configObject.authType === AuthType.OAuth2ClientCredentials &&
    (!configObject.accessTokenUrl || !configObject.clientId)
  ) {
    const missingFields = [];
    if (!configObject.accessTokenUrl) {
      missingFields.push('Access Token URL (accessTokenUrl)');
    }
    if (!configObject.clientId) {
      missingFields.push('Client ID (clientId)');
    }

    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.oauth2ConfigurationError', {
        defaultMessage: `error validation webhook action config: missing {missingItems} fields`,
        values: {
          missingItems: missingFields.join(', '),
        },
      })
    );
  }
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = configObject.url;

  validateUrl(configuredUrl);
  ensureUriAllowed(configuredUrl, configurationUtilities);
  validateAuthType(configObject);
  validateCertType(configObject, configurationUtilities);
  validateAdditionalFields(configObject);
  validateOAuth2(configObject);
}

// action executor
export async function executor(
  execOptions: WebhookConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const {
    actionId,
    config,
    params,
    configurationUtilities,
    logger,
    connectorUsageCollector,
    services,
  } = execOptions;

  const { method, url } = config;
  const { body: data } = params;

  const [axiosConfig, axiosConfigError] = await getAxiosConfig({
    connectorId: actionId,
    services,
    config,
    secrets: execOptions.secrets,
    configurationUtilities,
    logger,
  });

  if (axiosConfigError) {
    logger.error(
      `ConnectorId "${actionId}": error "${
        axiosConfigError.message ?? 'unknown error - couldnt load axios config'
      }"`
    );
    return errorResultRequestFailed(
      actionId,
      axiosConfigError.message ?? 'unknown error - couldnt load axios config'
    );
  }

  const { axiosInstance, headers, sslOverrides } = axiosConfig;
  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method,
      url,
      logger,
      headers,
      data,
      configurationUtilities,
      sslOverrides,
      connectorUsageCollector,
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  } else {
    const { error } = result;
    if (error.response) {
      const {
        status,
        statusText,
        headers: responseHeaders,
        data: { message: responseMessage },
      } = error.response;
      const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
      const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
      logger.error(`error on ${actionId} webhook event: ${message}`);
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // special handling for 5xx
      if (status >= 500) {
        return retryResult(actionId, message);
      }

      // special handling for rate limiting
      if (status === 429) {
        return pipe(
          getRetryAfterIntervalFromHeaders(responseHeaders),
          map((retry) => retryResultSeconds(actionId, message, retry)),
          getOrElse(() => retryResult(actionId, message))
        );
      }

      if (status === 404) {
        return errorResultInvalid(actionId, message, TaskErrorSource.USER);
      }

      return errorResultInvalid(actionId, message);
    } else if (error.code) {
      const message = `[${error.code}] ${error.message}`;
      logger.error(`error on ${actionId} webhook event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} webhook event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} webhook action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string,
  errorSource?: TaskErrorSource
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'error calling webhook, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
    errorSource,
  };
}

function errorResultRequestFailed(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.requestFailedErrorMessage', {
    defaultMessage: 'error calling webhook, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.unreachableErrorMessage', {
    defaultMessage: 'error calling webhook, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function errorResultUnexpectedNullResponse(actionId: string): ConnectorTypeExecutorResult<void> {
  const message = i18n.translate(
    'xpack.stackConnectors.webhook.unexpectedNullResponseErrorMessage',
    {
      defaultMessage: 'unexpected null response from webhook',
    }
  );
  return {
    status: 'error',
    actionId,
    message,
  };
}

function retryResult(actionId: string, serviceMessage: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
    serviceMessage,
  };
}

function retryResultSeconds(
  actionId: string,
  serviceMessage: string,

  retryAfter: number
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry at {retryString}',
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
    serviceMessage,
  };
}
