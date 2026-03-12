/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue } from 'axios';
import type { Logger } from '@kbn/core/server';
import { McpClient } from '@kbn/mcp-client';

import type { AuthTypeRegistry } from '../auth_types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { buildCustomFetch, type FetchLike } from './build_custom_fetch';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';
import { buildGetTokenCallback, type OAuth2AuthCodeParams } from './build_get_token_callback';

const MCP_CLIENT_VERSION = '0.0.1';

interface GetMcpClientOpts {
  authTypeRegistry: AuthTypeRegistry;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

export interface CreateMcpClientFnOpts {
  connectorId: string;
  url: string;
  secrets: Record<string, unknown>;
  additionalHeaders?: Record<string, AxiosHeaderValue>;
  connectorTokenClient?: ConnectorTokenClientContract;
}

export type CreateMcpClientFn = (opts: CreateMcpClientFnOpts) => Promise<McpClient>;

interface Build401RetryFetchOpts {
  baseFetch: FetchLike;
  authTypeId: string;
  connectorId: string;
  secrets: Record<string, unknown>;
  connectorTokenClient?: ConnectorTokenClientContract;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

/**
 * Wraps a base fetch with 401 retry logic for OAuth authorization code flow.
 * Mirrors the Axios 401 interceptor in {@link getAxiosInstanceWithAuth}.
 * For non-OAuth auth types, returns the base fetch unchanged (zero overhead).
 */
export function build401RetryFetch({
  baseFetch,
  authTypeId,
  connectorId,
  secrets,
  connectorTokenClient,
  logger,
  configurationUtilities,
}: Build401RetryFetchOpts): FetchLike {
  if (authTypeId !== 'oauth_authorization_code' || !connectorTokenClient) {
    return baseFetch;
  }

  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const response = await baseFetch(url, init);

    if (response.status === 401) {
      logger.debug(
        `MCP client received 401 for connectorId ${connectorId}, attempting token refresh`
      );

      const { clientId, clientSecret, tokenUrl, scope, useBasicAuth } =
        secrets as OAuth2AuthCodeParams;

      if (!clientId || !clientSecret || !tokenUrl) {
        return response;
      }

      const freshToken = await getOAuthAuthorizationCodeAccessToken({
        connectorId,
        logger,
        configurationUtilities,
        credentials: {
          config: { clientId, tokenUrl, useBasicAuth },
          secrets: { clientSecret },
        },
        connectorTokenClient,
        scope,
        forceRefresh: true,
      });

      if (freshToken) {
        logger.debug(`Token refreshed for connectorId ${connectorId}, retrying MCP request`);
        const headers = new Headers(init?.headers);
        headers.set('Authorization', freshToken);
        return baseFetch(url, { ...init, headers });
      }
    }

    return response;
  };
}

/**
 * Creates a factory function that produces configured, **unconnected** McpClient
 * instances. Mirrors the pattern of {@link getAxiosInstanceWithAuth} — the
 * factory captures long-lived dependencies (auth type registry, config
 * utilities, logger) and returns a function that callers invoke per-execution
 * with connector-specific values.
 *
 * The returned McpClient is not yet connected; the caller (i.e. the generated
 * executor) is responsible for calling `connect()` and `disconnect()`. This
 * separation keeps the door open for a future connection-lifecycle manager that
 * can sit behind the same factory interface and return pooled / pre-connected
 * clients without any executor changes.
 */
export const getMcpClientFactory = ({
  authTypeRegistry,
  configurationUtilities,
  logger,
}: GetMcpClientOpts): CreateMcpClientFn => {
  return async ({
    connectorId,
    url,
    secrets,
    additionalHeaders,
    connectorTokenClient,
  }: CreateMcpClientFnOpts): Promise<McpClient> => {
    let authTypeId: string | undefined;
    try {
      authTypeId = (secrets as { authType?: string }).authType || 'none';
      const authType = authTypeRegistry.get(authTypeId);

      const authContext = {
        getCustomHostSettings: (hostUrl: string) =>
          configurationUtilities.getCustomHostSettings(hostUrl),
        getToken: buildGetTokenCallback({
          authTypeId,
          connectorId,
          logger,
          configurationUtilities,
          connectorTokenClient,
        }),
        logger,
        proxySettings: configurationUtilities.getProxySettings(),
        sslSettings: configurationUtilities.getSSLSettings(),
      };

      const authHeaders = await authType.authenticate(authContext, secrets);

      const headers: Record<string, string> = { ...authHeaders };
      if (additionalHeaders) {
        for (const [key, value] of Object.entries(additionalHeaders)) {
          if (typeof value === 'string') {
            headers[key] = value;
          }
        }
      }

      const customFetch = buildCustomFetch(configurationUtilities, logger, url);
      const fetchWithRetry = build401RetryFetch({
        baseFetch: customFetch,
        authTypeId,
        connectorId,
        secrets,
        connectorTokenClient,
        logger,
        configurationUtilities,
      });

      return new McpClient(
        logger,
        { name: `kibana-v2-${connectorId}`, version: MCP_CLIENT_VERSION, url },
        {
          headers,
          fetch: fetchWithRetry,
        }
      );
    } catch (err) {
      logger.error(
        `Error creating MCP client for auth type "${authTypeId ?? 'unknown'}": ${err.message}`
      );
      throw err;
    }
  };
};
