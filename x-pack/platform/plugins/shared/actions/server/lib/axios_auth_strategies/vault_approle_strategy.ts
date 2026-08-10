/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts } from '@kbn/connector-specs';
import { getVaultAppRoleAccessToken } from '../get_vault_approle_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';

export class VaultAppRoleStrategy implements AxiosAuthStrategy {
  installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void {
    const { connectorId, connectorTokenClient } = deps;
    if (!connectorTokenClient) {
      throw new Error('Failed to delete invalid tokens: missing required ConnectorTokenClient.');
    }
    const { onFulfilled, onRejected } = getDeleteTokenAxiosInterceptor({
      connectorTokenClient,
      connectorId,
    });
    axiosInstance.interceptors.response.use(onFulfilled, onRejected);
  }

  async getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null> {
    if (opts.authType !== 'vault_approle') {
      throw new Error('VaultAppRoleStrategy received non-vault_approle token opts');
    }

    const { connectorId, connectorTokenClient, logger, configurationUtilities } = deps;

    return getVaultAppRoleAccessToken({
      connectorId,
      address: opts.address,
      namespace: opts.namespace,
      mountPath: opts.mountPath,
      roleId: opts.roleId,
      secretId: opts.secretId,
      logger,
      configurationUtilities,
      connectorTokenClient,
    });
  }
}
