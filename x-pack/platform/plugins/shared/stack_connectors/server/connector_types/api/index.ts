/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
import { pipe } from 'fp-ts/pipeable';
import { getOrElse, map } from 'fp-ts/Option';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';

import { SecretConfigurationSchema, WebhookMethods } from '@kbn/connector-schemas/common/auth';
import type { ActionParamsType } from '@kbn/connector-schemas/api';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  ParamsSchema,
} from '@kbn/connector-schemas/api';
import type { ApiConnectorType, ApiConnectorTypeExecutorOptions } from './types';
import type { Result } from '../lib/result_type';

import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import { isOk, promiseResult } from '../lib/result_type';
import { getAxiosConfig } from './get_axios_config';
import { validateConnectorTypeConfig } from './validations';
import {
  errorResultRequestFailed,
  errorResultUnexpectedNullResponse,
  errorResultInvalid,
  errorResultUnexpectedError,
  retryResult,
  retryResultSeconds,
} from './errors';

const userErrorCodes = [400, 404, 405, 406, 410, 411, 414, 428, 431];

// connector type definition
export function getConnectorType(): ApiConnectorType {
  return {
    id: CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: CONNECTOR_NAME,
    supportedFeatureIds: [WorkflowsConnectorFeatureId],
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
  const renderedParams: ActionParamsType = { ...params };

  if (params.body) {
    renderedParams.body = renderMustacheString(logger, params.body, variables, 'json');
  }

  if (params.path) {
    renderedParams.path = renderMustacheString(logger, params.path, variables, 'json');
  }

  if (params.query) {
    const renderedQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.query)) {
      renderedQuery[key] = renderMustacheString(logger, value, variables, 'json');
    }
    renderedParams.query = renderedQuery;
  }

  if (params.headers) {
    const renderedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.headers)) {
      renderedHeaders[key] = renderMustacheString(logger, value, variables, 'json');
    }
    renderedParams.headers = renderedHeaders;
  }

  return renderedParams;
}

function methodExpectsBody({ method }: { method: WebhookMethods }): boolean {
  return ![WebhookMethods.GET, WebhookMethods.DELETE].includes(method);
}

function combineUrl(basePath: string, path?: string): string {
  const basePathNormalized = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const pathNormalized = path?.startsWith('/') ? path : path ? `/${path}` : '';
  return `${basePathNormalized}${pathNormalized}`;
}

function buildQueryString(query?: Record<string, string>): string {
  if (!query || Object.keys(query).length === 0) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    params.append(key, value);
  }
  return `?${params.toString()}`;
}

// action executor
export async function executor(
  execOptions: ApiConnectorTypeExecutorOptions
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

  const { basePath, headers: configHeaders } = config;
  const { method, path, body: data, query, headers: paramsHeaders, timeout } = params;

  // Combine basePath and path
  const url = combineUrl(basePath, path) + buildQueryString(query);

  // Merge headers: params headers take precedence over config headers
  const mergedHeaders = {
    ...(configHeaders || {}),
    ...(paramsHeaders || {}),
  };

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

  const { axiosInstance, headers: authHeaders, sslOverrides } = axiosConfig;

  // Merge auth headers with merged config/params headers
  const finalHeaders = {
    ...mergedHeaders,
    ...authHeaders,
  };

  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method,
      url,
      logger,
      headers: finalHeaders,
      data: methodExpectsBody({ method }) ? data : undefined,
      configurationUtilities,
      sslOverrides,
      connectorUsageCollector,
      timeout,
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from api action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, result.value.data);
  } else {
    const { error } = result;
    if (error.response) {
      const { status, statusText, headers: responseHeaders, data: responseData } = error.response;
      const responseMessage = responseData?.message;
      const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
      const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
      logger.error(`error on ${actionId} api event: ${message}`);
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

      const errorResult = errorResultInvalid(actionId, message);

      if (userErrorCodes.includes(status)) {
        errorResult.errorSource = TaskErrorSource.USER;
      }

      return errorResult;
    } else if (error.code) {
      const message = `[${error.code}] ${error.message}`;
      logger.error(`error on ${actionId} api event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} api event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} api action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}
