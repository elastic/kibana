/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureConfigAuthType } from './ensure_config_auth_type';

describe('ensureConfigAuthType', () => {
  test('copies secrets.authType when config.authType is absent', () => {
    expect(
      ensureConfigAuthType({ apiUrl: 'https://example.com' }, { authType: 'bearer', token: 't' })
    ).toEqual({
      apiUrl: 'https://example.com',
      authType: 'bearer',
    });
  });

  test('preserves existing config.authType when already set', () => {
    expect(
      ensureConfigAuthType(
        { authType: 'bearer', apiUrl: 'https://example.com' },
        { authType: 'oauth_authorization_code', clientId: 'x' }
      )
    ).toEqual({
      authType: 'bearer',
      apiUrl: 'https://example.com',
    });
  });

  test('does not modify config when secrets.authType is absent', () => {
    const config = { apiUrl: 'https://example.com' };
    expect(ensureConfigAuthType(config, { token: 't' })).toBe(config);
  });

  test('does not modify config when both auth types are absent', () => {
    const config = { apiUrl: 'https://example.com' };
    expect(ensureConfigAuthType(config, {})).toBe(config);
  });
});
