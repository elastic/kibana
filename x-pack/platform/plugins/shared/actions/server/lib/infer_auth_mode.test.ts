/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthTypeRegistry } from '../auth_types/auth_type_registry';
import { registerAuthTypes } from '../auth_types/register_auth_types';
import { inferAuthMode } from './infer_auth_mode';

describe('inferAuthMode', () => {
  const authTypeRegistry = new AuthTypeRegistry();
  registerAuthTypes(authTypeRegistry);

  it('returns undefined when no authType is provided', () => {
    const result = inferAuthMode({ authTypeRegistry });
    expect(result).toBeUndefined();
  });

  it('returns undefined when auth type is not found', () => {
    const result = inferAuthMode({ authTypeRegistry, secrets: { authType: 'unknown' } });
    expect(result).toBeUndefined();
  });

  it('returns per-user for OAuth authorization code', () => {
    const result = inferAuthMode({
      authTypeRegistry,
      secrets: { authType: 'oauth_authorization_code' },
    });
    expect(result).toBe('per-user');
  });

  it('returns shared for basic auth', () => {
    const result = inferAuthMode({ authTypeRegistry, secrets: { authType: 'basic' } });
    expect(result).toBe('shared');
  });

  it('defaults to shared when authMode is not specified in auth type spec', () => {
    const result = inferAuthMode({ authTypeRegistry, secrets: { authType: 'bearer' } });
    expect(result).toBe('shared');
  });

  it('uses config authType when secrets authType is missing', () => {
    const result = inferAuthMode({ authTypeRegistry, config: { authType: 'basic' } });
    expect(result).toBe('shared');
  });
});
