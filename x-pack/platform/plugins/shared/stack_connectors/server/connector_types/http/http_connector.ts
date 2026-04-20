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

import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { getProxySettings } from '@kbn/actions-utils';
import {
  WorkflowsConnectorFeatureId,
  AgentBuilderConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';

import type { ActionParamsType } from '@kbn/connector-schemas/http';
import {
  CONNECTOR_ID,
  CONNECTOR_ID_SYSTEM,
  CONNECTOR_NAME,
  ConfigSchema,
  ParamsSchema,
} from '@kbn/connector-schemas/http';
import { z } from '@kbn/zod/v4';
import { SecretsSchema } from '@kbn/connector-schemas/http/schemas/v1';
import { safeJsonStringify } from '@kbn/std';
import type {
  HttpConnectorType,
  HttpConnectorTypeExecutorOptions,
  HttpConnectorTypeExecutorResult,
} from './types';
import type { Result } from '../lib/result_type';

import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import { isOk, promiseResult } from '../lib/result_type';
import { getAxiosConfig } from './get_axios_config';
import { ensureUriAllowed, validateConnectorTypeConfig } from './validations';
import {
  errorResultRequestFailed,
  errorResultUnexpectedNullResponse,
  errorResultInvalid,
  errorResultUnexpectedError,
  retryResult,
  retryResultSeconds,
  getErrorResponseMessage,
} from './errors';

const userErrorCodes = [400, 404, 405, 406, 410, 411, 414, 428, 431];

// connector type definition

// This is currently a Workflows-only connector.
// Ownership can be extended to support other features if needed.
const connectorTypeDefinition: Omit<HttpConnectorType, 'id' | 'validate'> = {
  minimumLicenseRequired: 'gold',
  name: CONNECTOR_NAME,
  supportedFeatureIds: [WorkflowsConnectorFeatureId, AgentBuilderConnectorFeatureId],
  renderParameterTemplates,
  executor,
};

/**
 * Exports 2 connector types:
 * - The regular connector type: To be executed with saved objects instance, manages authentication and secrets configuration
 * - The system connector type: To be executed as system action without the need of creating a saved objects instance, doesn't manage authentication and secrets configuration
 */

export const getConnectorType = (): HttpConnectorType => ({
  id: CONNECTOR_ID,
  ...connectorTypeDefinition,
  validate: {
    config: {
      schema: ConfigSchema,
      customValidator: (config, validatorServices) => {
        validateConnectorTypeConfig(config, validatorServices);
        if (config.proxyUrl) {
          ensureUriAllowed(config.proxyUrl, validatorServices.configurationUtilities);
        }
        return null;
      },
    },
    secrets: {
      schema: SecretsSchema,
      customValidator: (secrets) => {
        const { proxyUsername, proxyPassword } = secrets;
        if ((proxyUsername && !proxyPassword) || (!proxyUsername && proxyPassword)) {
          throw new Error('proxyUsername and proxyPassword must both be provided, or neither');
        }
      },
    },
    connector: (config, secrets) => {
      if (config.hasProxyAuth && !config.proxyUrl) {
        return 'proxyUrl is required when proxy authentication is enabled';
      }
      if (config.hasProxyAuth && (!secrets.proxyUsername || !secrets.proxyPassword)) {
        return 'proxyUsername and proxyPassword are required when proxy authentication is enabled';
      }
      return null;
    },
    params: {
      schema: ParamsSchema,
    },
  },
});

export const getSystemConnectorType = (): HttpConnectorType => ({
  id: CONNECTOR_ID_SYSTEM,
  ...connectorTypeDefinition,
  isSystemActionType: true,
  validate: {
    config: {
      schema: z.object({}).strict(),
    },
    secrets: {
      schema: z.object({}).strict(),
    },
    params: {
      schema: ParamsSchema,
    },
  },
});

// Helper functions

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  const renderedParams: ActionParamsType = { ...params };

  if (typeof params.body === 'string') {
    renderedParams.body = renderMustacheString(logger, params.body, variables, 'json');
  }

  if (params.url) {
    renderedParams.url = renderMustacheString(logger, params.url, variables, 'json');
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

function serializeHttpRequestBody(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  return safeJsonStringify(body, (error) => {
    throw new Error(`Error serializing request body: ${error.message}`);
  }) as string; // will return a string or throw an error if it fails
}

// action executor
export async function executor(
  execOptions: HttpConnectorTypeExecutorOptions
): Promise<HttpConnectorTypeExecutorResult> {
  const {
    actionId,
    config,
    params,
    configurationUtilities,
    logger,
    connectorUsageCollector,
    services,
    signal,
  } = execOptions;

  const { method, path, body, query, headers: paramsHeaders, fetcher } = params;

  // params always takes precedence over config
  const baseUrl = params.url || config.url;
  if (!baseUrl) {
    return errorResultInvalid(actionId, 'URL is required');
  }

  // Combine base url and path
  const url = combineUrl(baseUrl, path) + buildQueryString(query);

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

  const { axiosInstance, headers: configHeaders, sslOverrides: baseSslOverrides } = axiosConfig;

  // Merge headers: params headers take precedence over config headers
  const finalHeaders = { ...configHeaders, ...(paramsHeaders || {}) };

  // Connector-level proxy overrides
  const proxyOverrides = getProxySettings({
    url: config.proxyUrl ?? undefined,
    hasAuth: config.hasProxyAuth,
    username: execOptions.secrets.proxyUsername ?? undefined,
    password: execOptions.secrets.proxyPassword ?? undefined,
    verificationMode: config.proxyVerificationMode,
  });

  // Handle fetcher options
  let sslOverrides = baseSslOverrides;
  let maxRedirects: number | undefined;
  let keepAlive: boolean | undefined;

  if (fetcher && Object.keys(fetcher).length > 0) {
    // Map skip_ssl_verification to sslOverrides
    if (fetcher.skip_ssl_verification) {
      sslOverrides = { ...sslOverrides, verificationMode: 'none' };
    }

    // Handle redirect configuration
    maxRedirects = fetcher.max_redirects;
    if (fetcher.follow_redirects === false) {
      maxRedirects = 0;
    }

    keepAlive = fetcher.keep_alive;
  }

  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method,
      url,
      logger,
      headers: finalHeaders,
      data: serializeHttpRequestBody(body),
      configurationUtilities,
      sslOverrides,
      proxyOverrides,
      connectorUsageCollector,
      keepAlive,
      maxRedirects,
      ...(fetcher?.max_content_length != null && {
        maxContentLength: fetcher.max_content_length,
        maxBodyLength: fetcher.max_content_length,
      }),
      signal,
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { status, statusText, data },
    } = result;
    logger.debug(`response from http action "${actionId}": [HTTP ${status}] ${statusText}`);

    const headers = Object.entries(result.value.headers || {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value != null) {
          acc[key] = String(value);
        }
        return acc;
      },
      {}
    );

    return { status: 'ok', actionId, data: { status, statusText, headers, data } };
  } else {
    const { error } = result;
    if (error.response) {
      const { status, statusText, headers: responseHeaders } = error.response;

      const responseMessage = getErrorResponseMessage(error);
      const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
      const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
      logger.error(`error on ${actionId} http event: ${message}`);
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
      logger.error(`error on ${actionId} http event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} http event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} http action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}
