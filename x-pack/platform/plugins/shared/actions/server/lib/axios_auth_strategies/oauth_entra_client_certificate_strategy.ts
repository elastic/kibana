/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts } from '@kbn/connector-specs';
import { CLIENT_ASSERTION_TYPE, EntraAuthError } from '@kbn/connector-specs';
import { buildClientAssertion } from '../build_client_assertion';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import type { AuthStrategyDeps, AxiosAuthStrategy } from './types';

interface EntraCertSecrets {
  certificate: string;
  privateKey: string;
  passphrase?: string;
}

export class OAuthEntraClientCertificateStrategy implements AxiosAuthStrategy {
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
    if (opts.authType !== 'oauth_entra_client_certificate') {
      throw new Error(
        'OAuthEntraClientCertificateStrategy received non-oauth_entra_client_certificate token opts'
      );
    }

    const { connectorId, connectorTokenClient, logger, configurationUtilities, secrets } = deps;
    const { certificate, privateKey, passphrase } = secrets as unknown as EntraCertSecrets;

    return getOAuthClientCredentialsAccessToken({
      connectorId,
      logger,
      tokenUrl: opts.tokenUrl,
      oAuthScope: opts.scope,
      configurationUtilities,
      credentials: {
        type: 'client_assertion',
        config: {
          clientId: opts.clientId,
          buildAdditionalFields: () => {
            try {
              return {
                client_assertion: buildClientAssertion({
                  tokenUrl: opts.tokenUrl,
                  clientId: opts.clientId,
                  certificate,
                  privateKey,
                  passphrase,
                }),
                client_assertion_type: CLIENT_ASSERTION_TYPE,
              };
            } catch (error) {
              throw new EntraAuthError(
                'assertion',
                `Unable to build client assertion (check certificate/privateKey/passphrase): ${error.message}`,
                { cause: error }
              );
            }
          },
        },
      },
      connectorTokenClient,
    });
  }
}
