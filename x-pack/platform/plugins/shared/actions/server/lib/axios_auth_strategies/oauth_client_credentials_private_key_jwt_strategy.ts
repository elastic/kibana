/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { CertificateBindingKind, GetTokenOpts, JwtAlgorithm } from '@kbn/connector-specs';
import { CLIENT_ASSERTION_TYPE } from '@kbn/connector-specs';
import type { CertificateBinding } from '../build_client_assertion';
import { buildClientAssertion } from '../build_client_assertion';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import type { AuthStrategyDeps, AxiosAuthStrategy } from './types';

interface PrivateKeyJwtSecrets {
  algorithm: JwtAlgorithm;
  certificateBinding: CertificateBindingKind;
  certificate?: string;
  keyId?: string;
  privateKey: string;
  passphrase?: string;
}

function toBindingDescriptor(secrets: PrivateKeyJwtSecrets): CertificateBinding {
  switch (secrets.certificateBinding) {
    case 'x5t#S256':
    case 'x5c':
      if (!secrets.certificate) {
        throw new Error(`certificateBinding=${secrets.certificateBinding} requires certificate`);
      }
      return { kind: secrets.certificateBinding, certificate: secrets.certificate };
    case 'kid':
      if (!secrets.keyId) throw new Error('certificateBinding=kid requires keyId');
      return { kind: 'kid', keyId: secrets.keyId };
  }
}

export class OAuthClientCredentialsPrivateKeyJwtStrategy implements AxiosAuthStrategy {
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
    if (opts.authType !== 'oauth_client_credentials_private_key_jwt') {
      throw new Error(
        'OAuthClientCredentialsPrivateKeyJwtStrategy received non-oauth_client_credentials_private_key_jwt token opts'
      );
    }

    const { connectorId, connectorTokenClient, logger, configurationUtilities, secrets } = deps;
    const typedSecrets = secrets as unknown as PrivateKeyJwtSecrets;

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
                  algorithm: typedSecrets.algorithm,
                  certificateBinding: toBindingDescriptor(typedSecrets),
                  privateKey: typedSecrets.privateKey,
                  passphrase: typedSecrets.passphrase,
                }),
                client_assertion_type: CLIENT_ASSERTION_TYPE,
              };
            } catch (error) {
              throw new Error(
                `Unable to build client assertion (check certificate/privateKey/passphrase/keyId for the chosen binding): ${error.message}`,
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
