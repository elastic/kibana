/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usesOAuthAuthorizationCode } from './check_oauth_auth_code';
import type { ActionConnector } from '../../types';

const createConnector = (overrides: Partial<ActionConnector> = {}): ActionConnector =>
  ({
    id: 'connector-1',
    actionTypeId: '.test',
    name: 'Test Connector',
    config: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    ...overrides,
  } as ActionConnector);

describe('usesOAuthAuthorizationCode', () => {
  it('returns false for preconfigured connectors', () => {
    const connector = createConnector({
      isPreconfigured: true,
    });
    expect(usesOAuthAuthorizationCode(connector)).toBe(false);
  });

  it('returns false for system actions', () => {
    const connector = createConnector({
      isSystemAction: true,
    });
    expect(usesOAuthAuthorizationCode(connector)).toBe(false);
  });

  it('returns true when config.authType is oauth_authorization_code', () => {
    const connector = createConnector({ config: { authType: 'oauth_authorization_code' } });
    expect(usesOAuthAuthorizationCode(connector)).toBe(true);
  });

  it('returns true when config.auth.type is oauth_authorization_code', () => {
    const connector = createConnector({
      config: { auth: { type: 'oauth_authorization_code' } },
    });
    expect(usesOAuthAuthorizationCode(connector)).toBe(true);
  });

  it('returns true when authMode is per-user (API-created spec connector)', () => {
    const connector = createConnector({ authMode: 'per-user', config: {} });
    expect(usesOAuthAuthorizationCode(connector)).toBe(true);
  });

  it('returns false when authMode is shared and config has no OAuth auth type', () => {
    const connector = createConnector({ authMode: 'shared', config: {} });
    expect(usesOAuthAuthorizationCode(connector)).toBe(false);
  });

  it('returns false when connector has non-OAuth auth type', () => {
    const connector = createConnector({ config: { authType: 'basic' } });
    expect(usesOAuthAuthorizationCode(connector)).toBe(false);
  });

  it('returns false when connector has empty config', () => {
    const connector = createConnector({ config: {} });
    expect(usesOAuthAuthorizationCode(connector)).toBe(false);
  });
});
