/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAxiosAuthStrategy } from './get_axios_auth_strategy';
import { EarsStrategy } from './ears_strategy';
import { OAuthAuthCodeStrategy } from './oauth_auth_code_strategy';
import { DefaultStrategy } from './default_strategy';

describe('getAxiosAuthStrategy', () => {
  it('returns EarsStrategy for "ears"', () => {
    expect(getAxiosAuthStrategy('ears')).toBeInstanceOf(EarsStrategy);
  });

  it('returns OAuthAuthCodeStrategy for "oauth_authorization_code"', () => {
    expect(getAxiosAuthStrategy('oauth_authorization_code')).toBeInstanceOf(OAuthAuthCodeStrategy);
  });

  it('returns DefaultStrategy for "oauth_client_credentials"', () => {
    expect(getAxiosAuthStrategy('oauth_client_credentials')).toBeInstanceOf(DefaultStrategy);
  });

  it('returns DefaultStrategy for "none"', () => {
    expect(getAxiosAuthStrategy('none')).toBeInstanceOf(DefaultStrategy);
  });

  it('returns DefaultStrategy for unknown auth types', () => {
    expect(getAxiosAuthStrategy('some_future_type')).toBeInstanceOf(DefaultStrategy);
  });
});
