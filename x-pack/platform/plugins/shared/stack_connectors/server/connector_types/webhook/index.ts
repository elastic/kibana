/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AxiosError, AxiosResponse } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { pipe } from 'fp-ts/pipeable';
import { map, getOrElse } from 'fp-ts/Option';
import Boom from '@hapi/boom';
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
import { combineHeadersWithBasicAuthHeader } from '@kbn/actions-plugin/server/lib';

import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { SSLCertType } from '../../../common/auth/constants';
import type {
  WebhookConnectorType,
  ActionParamsType,
  ConnectorTypeConfigType,
  WebhookConnectorTypeExecutorOptions,
  ConnectorTypeSecretsType,
} from './types';

import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import type { Result } from '../lib/result_type';
import { isOk, promiseResult } from '../lib/result_type';
import { ConfigSchema, ParamsSchema } from './schema';
import { buildConnectorAuth } from '../../../common/auth/utils';
import { AuthType } from '../../../common/auth/constants';
import { WebhookSecretConfigurationSchema } from '../../../common/auth/schema';

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
        schema: WebhookSecretConfigurationSchema,
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

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = configObject.url;
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

  if (Boolean(configObject.authType) && !configObject.hasAuth) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.authConfigurationError', {
        defaultMessage:
          'error validation webhook action config: authType must be null or undefined if hasAuth is false',
      })
    );
  }

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

  const connectorTokenClient = services.connectorTokenClient;

  const {
    method,
    url,
    headers = {},
    hasAuth,
    authType,
    ca,
    accessTokenUrl,
    clientId,
    scope,
    verificationMode,
    additionalFields,
  } = config;

  let parsedAdditionalFields: Record<string, unknown> | undefined;
  if (additionalFields) {
    try {
      parsedAdditionalFields = JSON.parse(additionalFields);

      if (typeof parsedAdditionalFields !== 'object' || Array.isArray(parsedAdditionalFields)) {
        throw new Error(`additionalFields must be a valid JSON object in connector ${actionId}.`);
      }
    } catch (e) {
      const errorMessage = `Invalid JSON format provided for additionalFields in connector ${actionId}.`;
      logger.error(errorMessage, e);
      throw Boom.badRequest(errorMessage);
    }
  }

  const { body: data } = params;

  const secrets: ConnectorTypeSecretsType = execOptions.secrets;
  const { basicAuth, sslOverrides } = buildConnectorAuth({
    hasAuth,
    authType,
    secrets,
    verificationMode,
    ca,
  });
  const clientSecret = secrets.clientSecret;
  const axiosInstance = axios.create();

  if (authType === AuthType.OAuth2) {
    if (!connectorTokenClient) {
      const serviceMessage = 'ConnectorTokenClient is not available for OAuth2 flow.';
      const errorMessage = `Error executing webhook action "${actionId}": ${serviceMessage}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (!accessTokenUrl || !clientId || !clientSecret) {
      const missingItems = [];
      if (!accessTokenUrl) missingItems.push('Access Token URL');
      if (!clientId) missingItems.push('Client ID');
      if (!clientSecret) missingItems.push('Client Secret');

      const serviceMessage = `Missing required OAuth2 configuration: ${missingItems.join(', ')}`;
      const errorMessage = `Error executing webhook action "${actionId}": ${serviceMessage}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    axiosInstance.interceptors.request.use(
      async (axiosConfig) => {
        const accessToken = await getOAuthClientCredentialsAccessToken({
          connectorId: actionId,
          logger,
          configurationUtilities,
          oAuthScope: scope ?? '',
          credentials: {
            secrets: { clientSecret },
            config: {
              clientId,
              ...(parsedAdditionalFields ? { additionalFields: parsedAdditionalFields } : {}),
            },
          },
          tokenUrl: accessTokenUrl,
          connectorTokenClient,
        });

        if (!accessToken) {
          throw new Error(`Unable to retrieve access token for connectorId: ${actionId}`);
        }

        logger.debug(`Successfully obtained OAuth2 token for connector "${actionId}"`);
        axiosConfig.headers.Authorization = accessToken;

        return axiosConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }
  const headersWithAuth = combineHeadersWithBasicAuthHeader({
    username: basicAuth.auth?.username,
    password: basicAuth.auth?.password,
    headers,
  });

  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method,
      url,
      logger,
      headers: headersWithAuth,
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
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'error calling webhook, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
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
