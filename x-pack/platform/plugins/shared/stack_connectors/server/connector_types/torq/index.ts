/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { curry } from 'lodash';
import type { AxiosError, AxiosResponse } from 'axios';
import axios from 'axios';
import { pipe } from 'fp-ts/pipeable';
import { map, getOrElse } from 'fp-ts/Option';
import type { Logger } from '@kbn/core/server';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
} from '@kbn/actions-plugin/server';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { renderMustacheObject } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ActionTypeExecutorResult, ValidatorServices } from '@kbn/actions-plugin/server/types';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
} from '@kbn/connector-schemas/torq';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  ParamsSchema,
  SecretsSchema,
} from '@kbn/connector-schemas/torq';
import { isValidTorqHostName } from '../../../common/torq';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import type { Result } from '../lib/result_type';
import { promiseResult, isOk } from '../lib/result_type';

export type TorqConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type TorqActionTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

// action type definition
export function getActionType(): TorqConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
      WorkflowsConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateActionTypeConfig,
      },
      secrets: {
        schema: SecretsSchema,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    renderParameterTemplates,
    executor: curry(executor)(),
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  if (!params.body) return params;
  return renderMustacheObject(logger, params, variables);
}

function validateActionTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const configuredUrl = configObject.webhookIntegrationUrl;
  let configureUrlObj: URL;
  try {
    configureUrlObj = new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.torq.torqConfigurationErrorNoHostname', {
        defaultMessage: 'error configuring send to Torq action: unable to parse url: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }

  try {
    validatorServices.configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.torq.torqConfigurationError', {
        defaultMessage: 'error configuring send to Torq action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }

  if (!isValidTorqHostName(configureUrlObj.hostname) && configureUrlObj.hostname !== 'localhost') {
    throw new Error(
      i18n.translate('xpack.stackConnectors.torq.torqConfigurationErrorInvalidHostname', {
        defaultMessage:
          'error configuring send to Torq action: url must begin with https://hooks.torq.io or https://hooks.eu.torq.io',
      })
    );
  }
}

// action executor
export async function executor(
  execOptions: TorqActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const { webhookIntegrationUrl } = execOptions.config;
  const { body: data } = execOptions.params;
  const configurationUtilities = execOptions.configurationUtilities;
  const connectorUsageCollector = execOptions.connectorUsageCollector;

  const secrets: ConnectorTypeSecretsType = execOptions.secrets;
  const token = secrets.token;

  let body;
  try {
    body = JSON.parse(data || 'null');
  } catch (err) {
    return errorInvalidBody(actionId, execOptions.logger, err);
  }

  const axiosInstance = axios.create();
  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      url: webhookIntegrationUrl,
      method: 'post',
      headers: {
        'X-Torq-Token': token || '',
        'Content-Type': 'application/json',
      },
      data: body,
      configurationUtilities,
      logger: execOptions.logger,
      validateStatus: (status: number) => status >= 200 && status < 300,
      connectorUsageCollector,
    })
  );

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    execOptions.logger.debug(
      `response from Torq action "${actionId}": [HTTP ${status}] ${statusText}`
    );
    return successResult(actionId, data);
  }
  const { error } = result;
  return handleExecutionError(error, execOptions.logger, actionId);
}

async function handleExecutionError(
  error: AxiosError<{ message: string }>,
  logger: Logger,
  actionId: string
): Promise<ActionTypeExecutorResult<unknown>> {
  if (error.response) {
    const {
      status,
      statusText,
      headers: responseHeaders,
      data: { message: responseMessage },
    } = error.response;
    const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
    const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
    logger.error(`error on ${actionId} Torq event: ${message}`);
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

    if (status === 405) {
      return errorResultInvalidMethod(actionId, message);
    }

    if (status === 401) {
      return errorResultUnauthorised(actionId, message);
    }

    if (status === 404) {
      return errorNotFound(actionId, message);
    }

    return errorResultInvalid(actionId, message);
  } else if (error.code) {
    const message = `[${error.code}] ${error.message}`;
    logger.error(`error on ${actionId} Torq event: ${message}`);
    return errorResultRequestFailed(actionId, message);
  } else if (error.isAxiosError) {
    const message = `${error.message}`;
    logger.error(`error on ${actionId} Torq event: ${message}`);
    return errorResultRequestFailed(actionId, message);
  }
  logger.error(`error on ${actionId} Torq action: unexpected error`);
  return errorResultUnexpectedError(actionId);
}

function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorInvalidBody(
  actionId: string,
  logger: Logger,
  err: Error
): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.invalidBodyErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, invalid body',
  });
  logger.error(`error on ${actionId} Torq event: ${errMessage}: ${err.message}`);
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage: err.message,
  };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.invalidResponseErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorNotFound(actionId: string, serviceMessage: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.notFoundErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, make sure the webhook URL is valid',
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
): ActionTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.requestFailedErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultInvalidMethod(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.invalidMethodErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, method is not supported',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnauthorised(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.unauthorisedErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, unauthorised',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.torq.unreachableErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function retryResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.torq.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error triggering Torq workflow, retry later',
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
): ActionTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.torq.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error triggering Torq workflow, retry at {retryString}',
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
