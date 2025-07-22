/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecretsSchema as WebhookSecretsSchema } from './schema';

describe('WebhookSecretConfigurationSchemaValidation', () => {
  const errorMessage =
    'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)';

  it('returns error if only clientSecret is provided with other fields', () => {
    expect(() => WebhookSecretsSchema.validate({ clientSecret: 'secret', user: 'bob' })).toThrow(
      /must specify one of the following schemas/
    );
  });

  it('accepts only clientSecret for OAuth2', () => {
    expect(() => WebhookSecretsSchema.validate({ clientSecret: 'secret' })).not.toThrow();
  });

  it('accepts only user and password for basic auth', () => {
    expect(() => WebhookSecretsSchema.validate({ user: 'bob', password: 'secret' })).not.toThrow();
  });

  it('accepts crt and key for SSL', () => {
    expect(() => WebhookSecretsSchema.validate({ crt: 'crt', key: 'key' })).not.toThrow();
  });

  it('accepts only pfx', () => {
    expect(() => WebhookSecretsSchema.validate({ pfx: 'pfx' })).not.toThrow();
  });

  it('returns error if nothing is provided', () => {
    expect(() => WebhookSecretsSchema.validate({})).not.toThrow(); // No auth is allowed
  });

  it('should reject mixed PFX certificate and OAuth2', () => {
    expect(() =>
      WebhookSecretsSchema.validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(errorMessage);
  });

  it('should reject mixed SSL certificate and OAuth2', () => {
    expect(() =>
      WebhookSecretsSchema.validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(errorMessage);
  });

  it('should reject mixed basic auth and OAuth2', () => {
    expect(() =>
      WebhookSecretsSchema.validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(errorMessage);
  });
});
