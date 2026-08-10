/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestVaultAppRoleLogin } from './request_vault_approle_login';

interface GetVaultAppRoleAccessTokenOpts {
  connectorId?: string;
  address: string;
  namespace?: string;
  mountPath: string;
  roleId: string;
  secretId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  connectorTokenClient?: ConnectorTokenClientContract;
}

/**
 * Mirrors `getOAuthClientCredentialsAccessToken`'s cache/re-login shape (per the
 * connector-provisioning plan §5.4): checks for a cached, unexpired token via
 * `connectorTokenClient`; on cache miss/expiry, performs a fresh AppRole login and
 * caches the result via `updateOrReplace()`. There is no `refresh_token` concept
 * in Vault's AppRole method -- expiry always means a full re-login.
 */
export const getVaultAppRoleAccessToken = async ({
  connectorId,
  address,
  namespace,
  mountPath,
  roleId,
  secretId,
  logger,
  configurationUtilities,
  connectorTokenClient,
}: GetVaultAppRoleAccessTokenOpts): Promise<string | null> => {
  if (!roleId || !secretId) {
    logger.warn(`Missing required fields for requesting a Vault AppRole login token`);
    return null;
  }

  let accessToken: string;
  let connectorToken: ConnectorToken | null = null;
  let hasErrors = false;

  if (connectorId && connectorTokenClient) {
    const { connectorToken: token, hasErrors: errors } = await connectorTokenClient.get({
      connectorId,
    });
    connectorToken = token;
    hasErrors = errors;
  }

  if (
    connectorToken === null ||
    (connectorToken.expiresAt ? Date.parse(connectorToken.expiresAt) <= Date.now() : false)
  ) {
    const requestTokenStart = Date.now();

    const { clientToken, leaseDurationSec } = await requestVaultAppRoleLogin({
      address,
      namespace,
      mountPath,
      roleId,
      secretId,
      logger,
      configurationUtilities,
    });
    // Vault tokens are sent as a raw value (the `X-Vault-Token` header), not
    // prefixed with a scheme like "Bearer" -- unlike the OAuth-shaped tokens this
    // caching logic is otherwise modeled on.
    accessToken = clientToken;

    if (connectorId && connectorTokenClient) {
      try {
        await connectorTokenClient.updateOrReplace({
          connectorId,
          token: connectorToken,
          newToken: accessToken,
          tokenRequestDate: requestTokenStart,
          expiresInSec: leaseDurationSec,
          deleteExisting: hasErrors,
        });
      } catch (err) {
        logger.warn(
          `Not able to update connector token for connectorId: ${connectorId} due to error: ${err.message}`
        );
      }
    }
  } else {
    accessToken = connectorToken.token;
  }

  return accessToken;
};
