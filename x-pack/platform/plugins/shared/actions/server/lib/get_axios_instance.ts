/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AxiosError,
  AxiosHeaderValue,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import type { AuthMode, GetTokenOpts } from '@kbn/connector-specs';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ActionInfo } from './action_executor';
import type { AuthTypeRegistry } from '../auth_types';
import { getCustomAgents } from './get_custom_agents';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { getBeforeRedirectFn } from './before_redirect';
import { getAxiosAuthStrategy } from './axios_auth_strategies';

export type ConnectorInfo = Omit<ActionInfo, 'rawAction'>;

export const buildUserAgent = (cloud?: CloudSetup): string => {
  const parts = [`axios/${axios.VERSION}`];

  const projectId = cloud?.serverless?.projectId;
  const deploymentId = cloud?.deploymentId;
  if (projectId) {
    parts.push(`elastic (project:${projectId})`);
  } else if (deploymentId) {
    parts.push(`elastic (deployment:${deploymentId})`);
  }

  return parts.join(' ');
};

interface GetAxiosInstanceOpts {
  authTypeRegistry: AuthTypeRegistry;
  cloud?: CloudSetup;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

type ValidatedSecrets = Record<string, unknown>;

const MAX_CONTENT_LENGTH_ERROR_MESSAGE = 'maxContentLength';
const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
]);

const getHeaderValue = ({
  headers,
  headerName,
}: {
  headers: unknown;
  headerName: string;
}): unknown => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const normalizedHeaderName = headerName.toLowerCase();
  const headersRecord = headers as Record<string, unknown>;
  const matchingHeaderName = Object.keys(headersRecord).find(
    (key) => key.toLowerCase() === normalizedHeaderName
  );

  return matchingHeaderName ? headersRecord[matchingHeaderName] : undefined;
};

const getHeaderKeys = (headers: unknown): string[] => {
  if (!headers || typeof headers !== 'object') {
    return [];
  }

  return Object.keys(headers as Record<string, unknown>);
};

const getSanitizedHeaders = (headers: unknown): Record<string, unknown> => {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  return Object.entries(headers as Record<string, unknown>).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? '[REDACTED]' : value;
      return acc;
    },
    {}
  );
};

const logMaxContentLengthError = ({
  connectorId,
  error,
  logger,
  maxContentLength,
}: {
  connectorId: string;
  error: unknown;
  logger: Logger;
  maxContentLength: number;
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (!errorMessage.includes(MAX_CONTENT_LENGTH_ERROR_MESSAGE)) {
    return;
  }

  const axiosError = error as AxiosError & {
    request?: {
      res?: {
        headers?: unknown;
      };
    };
  };
  const responseHeaders = axiosError.response?.headers;
  const requestResponseHeaders = axiosError.request?.res?.headers;

  // Debug-level only; header values may contain non-sensitive but verbose data.
  // Sensitive headers (auth, cookies) are redacted by getSanitizedHeaders.
  logger.debug(
    `Actions Axios request exceeded maxContentLength: ${errorMessage}; metadata: ${JSON.stringify({
      connectorId,
      configuredMaxContentLength: maxContentLength,
      errorCode: axiosError.code,
      responseStatus: axiosError.response?.status,
      responseContentLength: getHeaderValue({
        headers: responseHeaders,
        headerName: 'content-length',
      }),
      requestResponseContentLength: getHeaderValue({
        headers: requestResponseHeaders,
        headerName: 'content-length',
      }),
      responseHeaderKeys: getHeaderKeys(responseHeaders),
      requestResponseHeaderKeys: getHeaderKeys(requestResponseHeaders),
      responseHeaders: getSanitizedHeaders(responseHeaders),
      requestResponseHeaders: getSanitizedHeaders(requestResponseHeaders),
    })}`
  );
};

export interface GetAxiosInstanceWithAuthFnOpts {
  additionalHeaders?: Record<string, AxiosHeaderValue>;
  connectorId: string;
  connectorTokenClient?: ConnectorTokenClientContract;
  secrets: ValidatedSecrets;
  signal?: AbortSignal;
  authMode?: AuthMode;
  profileUid?: string;
  maxContentLength?: number;
}
export type GetAxiosInstanceWithAuthFn = (
  opts: GetAxiosInstanceWithAuthFnOpts
) => Promise<AxiosInstance>;
export const getAxiosInstanceWithAuth = ({
  authTypeRegistry,
  cloud,
  configurationUtilities,
  logger,
}: GetAxiosInstanceOpts): GetAxiosInstanceWithAuthFn => {
  return async ({
    additionalHeaders,
    connectorId,
    secrets,
    connectorTokenClient,
    signal,
    authMode,
    profileUid,
    maxContentLength: maxContentLengthOverride,
  }: GetAxiosInstanceWithAuthFnOpts) => {
    let authTypeId: string | undefined;
    try {
      authTypeId = (secrets as { authType?: string }).authType || 'none';

      // throws if auth type is not found
      const authType = authTypeRegistry.get(authTypeId);

      const { maxContentLength, timeout: settingsTimeout } =
        configurationUtilities.getResponseSettings();

      const axiosInstance = axios.create({
        maxContentLength: maxContentLengthOverride ?? maxContentLength,
        // should we allow a way for a connector type to specify a timeout override?
        timeout: settingsTimeout,
        beforeRedirect: getBeforeRedirectFn(configurationUtilities),
        signal,
      });
      const configuredMaxContentLength = maxContentLengthOverride ?? maxContentLength;

      axiosInstance.defaults.headers.common['User-Agent'] = buildUserAgent(cloud);

      // add any additional headers that should be included in every request
      if (additionalHeaders) {
        Object.keys(additionalHeaders).forEach((key) => {
          axiosInstance.defaults.headers.common[key] = additionalHeaders[key];
        });
      }

      // create a request interceptor to inject custom http/https agents based on the URL
      axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
        if (config.url) {
          const { httpAgent, httpsAgent } = getCustomAgents(
            configurationUtilities,
            logger,
            config.url
          );

          // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
          config.httpAgent = httpAgent;
          config.httpsAgent = httpsAgent;
          config.proxy = false;
        }
        return config;
      });

      const strategy = getAxiosAuthStrategy(authTypeId);
      const strategyDeps = {
        connectorId,
        secrets,
        connectorTokenClient,
        logger,
        configurationUtilities,
        authMode,
        profileUid,
      };

      if (connectorTokenClient) {
        strategy.installResponseInterceptor(axiosInstance, strategyDeps);
      }

      const configureCtx = {
        getCustomHostSettings: (url: string) => configurationUtilities.getCustomHostSettings(url),
        getToken: (opts: GetTokenOpts) => strategy.getToken(opts, strategyDeps),
        logger,
        proxySettings: configurationUtilities.getProxySettings(),
        sslSettings: configurationUtilities.getSSLSettings(),
      };

      // use the registered auth type to configure authentication for the axios instance
      const configuredAxiosInstance = await authType.configure(
        configureCtx,
        axiosInstance,
        secrets
      );
      configuredAxiosInstance.interceptors.response.use(undefined, (error: unknown) => {
        logMaxContentLengthError({
          connectorId,
          error,
          logger,
          maxContentLength: configuredMaxContentLength,
        });
        return Promise.reject(error);
      });

      return configuredAxiosInstance;
    } catch (err) {
      logger.error(
        `Error getting configured axios instance configured for auth type "${
          authTypeId ?? 'unknown'
        }": ${err.message} `
      );
      throw err;
    }
  };
};
