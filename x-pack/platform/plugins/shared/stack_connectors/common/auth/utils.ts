/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isString, isEmpty } from 'lodash';

import type { SSLSettings } from '@kbn/actions-plugin/server/types';
import type {
  AuthTypeName,
  CAType,
  HasAuth,
  SecretsConfigurationType,
  VerificationModeType,
} from './types';

import { AuthType } from './constants';

// For backwards compatibility with connectors created before authType was added, interpret a
// hasAuth: true and undefined authType as basic auth
export const isBasicAuth = ({
  hasAuth,
  authType,
}: {
  hasAuth: HasAuth;
  authType: AuthTypeName;
}): boolean => hasAuth && (authType === AuthType.Basic || !authType);

interface BasicAuthResponse {
  auth?: { username: string; password: string };
}

export const buildConnectorAuth = ({
  hasAuth,
  authType,
  secrets,
  verificationMode,
  ca,
}: {
  hasAuth: HasAuth;
  authType: AuthTypeName;
  secrets: SecretsConfigurationType;
  verificationMode: VerificationModeType;
  ca: CAType;
}): { basicAuth: BasicAuthResponse; sslOverrides: SSLSettings } => {
  let basicAuth: BasicAuthResponse = {};
  let sslOverrides: SSLSettings = {};
  let sslCertificate = {};

  if (isBasicAuth({ hasAuth, authType })) {
    basicAuth =
      isString(secrets.user) && isString(secrets.password)
        ? { auth: { username: secrets.user, password: secrets.password } }
        : {};
  } else if (hasAuth && authType === AuthType.SSL) {
    sslCertificate =
      (isString(secrets.crt) && isString(secrets.key)) || isString(secrets.pfx)
        ? isString(secrets.pfx)
          ? {
              pfx: Buffer.from(secrets.pfx, 'base64'),
              ...(isString(secrets.password) ? { passphrase: secrets.password } : {}),
            }
          : {
              cert: Buffer.from(secrets.crt!, 'base64'),
              key: Buffer.from(secrets.key!, 'base64'),
              ...(isString(secrets.password) ? { passphrase: secrets.password } : {}),
            }
        : {};
  }

  sslOverrides = {
    ...sslCertificate,
    ...(verificationMode ? { verificationMode } : {}),
    ...(ca ? { ca: Buffer.from(ca, 'base64') } : {}),
  };

  return { basicAuth, sslOverrides };
};

export const validateConnectorAuthConfiguration = ({
  hasAuth,
  authType,
  basicAuth,
  sslOverrides,
  connectorName,
}: {
  hasAuth: HasAuth;
  authType: AuthTypeName;
  basicAuth: BasicAuthResponse;
  sslOverrides: SSLSettings;
  connectorName: string;
}) => {
  if (
    (isBasicAuth({ hasAuth, authType }) &&
      (!basicAuth.auth?.password || !basicAuth.auth?.username)) ||
    (authType === AuthType.SSL && isEmpty(sslOverrides))
  ) {
    throw Error(`[Action]${connectorName}: Wrong configuration.`);
  }
};
