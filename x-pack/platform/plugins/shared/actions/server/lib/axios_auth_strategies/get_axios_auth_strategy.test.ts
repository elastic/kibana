/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAxiosAuthStrategy } from './get_axios_auth_strategy';
import { EarsStrategy } from './ears_strategy';
import { OAuthAuthCodeStrategy } from './oauth_auth_code_strategy';
import { OAuthClientCredentialsStrategy } from './oauth_client_credentials_strategy';
import { OAuthClientCredentialsPrivateKeyJwtStrategy } from './oauth_client_credentials_private_key_jwt_strategy';

describe('getAxiosAuthStrategy', () => {
  it('returns EarsStrategy for "ears"', () => {
    expect(getAxiosAuthStrategy('ears')).toBeInstanceOf(EarsStrategy);
  });

  it('returns OAuthAuthCodeStrategy for "oauth_authorization_code"', () => {
    expect(getAxiosAuthStrategy('oauth_authorization_code')).toBeInstanceOf(OAuthAuthCodeStrategy);
  });

  it('returns OAuthClientCredentialsStrategy for "oauth_client_credentials"', () => {
    expect(getAxiosAuthStrategy('oauth_client_credentials')).toBeInstanceOf(
      OAuthClientCredentialsStrategy
    );
  });

  it('returns OAuthClientCredentialsPrivateKeyJwtStrategy for "oauth_client_credentials_private_key_jwt"', () => {
    expect(getAxiosAuthStrategy('oauth_client_credentials_private_key_jwt')).toBeInstanceOf(
      OAuthClientCredentialsPrivateKeyJwtStrategy
    );
  });

  it('returns OAuthClientCredentialsStrategy for "none"', () => {
    expect(getAxiosAuthStrategy('none')).toBeInstanceOf(OAuthClientCredentialsStrategy);
  });

  it('returns OAuthClientCredentialsStrategy for unknown auth types', () => {
    expect(getAxiosAuthStrategy('some_future_type')).toBeInstanceOf(OAuthClientCredentialsStrategy);
  });
});
