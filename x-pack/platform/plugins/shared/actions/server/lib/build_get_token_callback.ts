/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuthMode, GetTokenOpts } from '@kbn/connector-specs';

import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';

export interface OAuth2AuthCodeParams {
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  useBasicAuth?: boolean;
}

interface BuildGetTokenCallbackOpts {
  authTypeId: string;
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  connectorTokenClient?: ConnectorTokenClientContract;
  authMode?: AuthMode;
  profileUid?: string;
}

/**
 * Builds the `getToken` callback consumed by {@link AuthContext}. Centralises
 * the routing between OAuth authorization-code and client-credentials flows so
 * that both the Axios and MCP client factories share a single implementation.
 */
export const buildGetTokenCallback = ({
  authTypeId,
  connectorId,
  logger,
  configurationUtilities,
  connectorTokenClient,
  authMode,
  profileUid,
}: BuildGetTokenCallbackOpts) => {
  return async (opts: GetTokenOpts) => {
    if (authTypeId === 'oauth_authorization_code') {
      if (!connectorTokenClient) {
        throw new Error('ConnectorTokenClient is required for OAuth authorization code flow');
      }
      return await getOAuthAuthorizationCodeAccessToken({
        connectorId,
        logger,
        configurationUtilities,
        credentials: {
          config: {
            clientId: opts.clientId,
            tokenUrl: opts.tokenUrl,
            ...(opts.additionalFields ? { additionalFields: opts.additionalFields } : {}),
          },
          secrets: {
            clientSecret: opts.clientSecret,
          },
        },
        connectorTokenClient,
        scope: opts.scope,
        authMode,
        profileUid,
      });
    }

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
  };
};
