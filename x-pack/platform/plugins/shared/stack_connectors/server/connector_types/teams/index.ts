/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import { isString } from 'lodash';
import type { AxiosError, AxiosResponse } from 'axios';
import axios from 'axios';
import { i18n } from '@kbn/i18n';
import { pipe } from 'fp-ts/pipeable';
import { map, getOrElse } from 'fp-ts/Option';
import type {
  ClassicActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
} from '@kbn/connector-schemas/teams';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  ParamsSchema,
  SecretsSchema,
} from '@kbn/connector-schemas/teams';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import type { Result } from '../lib/result_type';
import { isOk, promiseResult } from '../lib/result_type';

export type TeamsConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;

export type TeamsConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

// connector type definition
export function getConnectorType(): TeamsConnectorType {
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
      config: { schema: ConfigSchema },
      secrets: {
        schema: SecretsSchema,
        customValidator: validateConnectorTypeConfig,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    executor: teamsExecutor,
  };
}

function validateConnectorTypeConfig(
  secretsObject: ConnectorTypeSecretsType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = secretsObject.webhookUrl;
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.teams.configurationErrorNoHostname', {
        defaultMessage: 'error configuring teams action: unable to parse host name from webhookUrl',
      })
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.teams.configurationError', {
        defaultMessage: 'error configuring teams action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

// action executor

async function teamsExecutor(
  execOptions: TeamsConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, secrets, params, configurationUtilities, logger, connectorUsageCollector } =
    execOptions;
  const { webhookUrl } = secrets;
  const { message } = params;
  const data = { text: message };

  const axiosInstance = axios.create();

  const result: Result<AxiosResponse, AxiosError> = await promiseResult(
    request({
      axios: axiosInstance,
      method: 'post',
      url: webhookUrl,
      logger,
      data,
      configurationUtilities,
      connectorUsageCollector,
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { status, statusText, data: responseData, headers: responseHeaders },
    } = result;

    // Microsoft Teams connectors do not throw 429s. Rather they will return a 200 response
    // with a 429 message in the response body when the rate limit is hit
    // https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using#rate-limiting-for-connectors
    if (isString(responseData) && responseData.includes('ErrorCode:ApplicationThrottled')) {
      return pipe(
        getRetryAfterIntervalFromHeaders(responseHeaders),
        map((retry) => retryResultSeconds(actionId, message, retry)),
        getOrElse(() => retryResult(actionId, message))
      );
    }

    logger.debug(`response from teams action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  } else {
    const { error } = result;

    if (error.response) {
      const { status, statusText } = error.response;
      const serviceMessage = `[${status}] ${statusText}`;
      logger.error(`error on ${actionId} Microsoft Teams event: ${serviceMessage}`);

      // special handling for 5xx
      if (status >= 500) {
        return retryResult(actionId, serviceMessage);
      }

      return errorResultInvalid(actionId, serviceMessage, getErrorSource(error));
    }

    logger.debug(`error on ${actionId} Microsoft Teams action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.teams.unreachableErrorMessage', {
    defaultMessage: 'error posting to Microsoft Teams, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string,
  errorSource?: TaskErrorSource
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.teams.invalidResponseErrorMessage', {
    defaultMessage: 'error posting to Microsoft Teams, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
    errorSource,
  };
}

function errorResultUnexpectedNullResponse(actionId: string): ConnectorTypeExecutorResult<void> {
  const message = i18n.translate('xpack.stackConnectors.teams.unexpectedNullResponseErrorMessage', {
    defaultMessage: 'unexpected null response from Microsoft Teams',
  });
  return {
    status: 'error',
    actionId,
    message,
  };
}

function retryResult(actionId: string, message: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.teams.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a Microsoft Teams message, retry later',
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
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.teams.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a Microsoft Teams message, retry at {retryString}',
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
