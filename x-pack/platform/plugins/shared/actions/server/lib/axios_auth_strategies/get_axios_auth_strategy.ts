/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosAuthStrategy } from './types';
import { EarsStrategy } from './ears_strategy';
import { OAuthAuthCodeStrategy } from './oauth_auth_code_strategy';
import { OAuthClientCredentialsStrategy } from './oauth_client_credentials_strategy';
import { OAuthClientCredentialsPrivateKeyJwtStrategy } from './oauth_client_credentials_private_key_jwt_strategy';

/**
 * Returns the AxiosAuthStrategy for the given auth type.
 * This is the single place where authTypeId is inspected for strategy selection,
 * which includes 401 handling and token request.
 */
export const getAxiosAuthStrategy = (authTypeId: string): AxiosAuthStrategy => {
  switch (authTypeId) {
    case 'ears':
      return new EarsStrategy();
    case 'oauth_authorization_code':
      return new OAuthAuthCodeStrategy();
    case 'oauth_client_credentials_private_key_jwt':
      return new OAuthClientCredentialsPrivateKeyJwtStrategy();
    default:
      return new OAuthClientCredentialsStrategy();
  }
};
