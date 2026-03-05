/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue } from 'axios';
import type { Logger } from '@kbn/core/server';
import { McpClient } from '@kbn/mcp-client';
import type { GetTokenOpts } from '@kbn/connector-specs';

import type { AuthTypeRegistry } from '../auth_types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { buildCustomFetch } from './build_custom_fetch';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';

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
        getToken: async (opts: GetTokenOpts) => {
          return await getOAuthClientCredentialsAccessToken({
            connectorId,
            logger,
            tokenUrl: opts.tokenUrl,
            oAuthScope: opts.scope,
            configurationUtilities,
            credentials: {
              config: {
                clientId: opts.clientId,
                ...(opts.additionalFields ? { additionalFields: opts.additionalFields } : {}),
              },
              secrets: {
                clientSecret: opts.clientSecret,
              },
            },
            connectorTokenClient,
          });
        },
        logger,
        proxySettings: configurationUtilities.getProxySettings(),
        sslSettings: configurationUtilities.getSSLSettings(),
      };

      const authHeaders = await authType.getHeaders(authContext, secrets);

      const headers: Record<string, string> = { ...authHeaders };
      if (additionalHeaders) {
        for (const [key, value] of Object.entries(additionalHeaders)) {
          if (typeof value === 'string') {
            headers[key] = value;
          }
        }
      }

      const customFetch = buildCustomFetch(configurationUtilities, logger, url);

      return new McpClient(
        logger,
        { name: `kibana-v2-${connectorId}`, version: MCP_CLIENT_VERSION, url },
        {
          headers,
          fetch: customFetch,
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
