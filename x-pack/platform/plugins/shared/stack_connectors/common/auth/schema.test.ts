/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecretConfigurationSchemaValidation, WebhookSecretConfigurationSchema } from './schema';

describe('SecretConfigurationSchemaValidation', () => {
  const { validate } = SecretConfigurationSchemaValidation;
  const errorMessage =
    'must specify one of the following schemas: user and password; crt and key (with optional password); or pfx (with optional password)';

  describe('valid configurations', () => {
    it('should accept empty credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept basic auth credentials', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept SSL certificate credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept SSL certificate with optional password', () => {
      const result = validate({
        user: null,
        password: 'cert-password',
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept PFX certificate credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept PFX certificate with optional password', () => {
      const result = validate({
        user: null,
        password: 'pfx-password',
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBeUndefined();
    });

    it('should accept OAuth2 credentials', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('invalid configurations', () => {
    it('should reject mixed basic auth and SSL certificate', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject mixed basic auth and PFX certificate', () => {
      const result = validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject mixed SSL certificate and PFX certificate', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: 'pfx-content',
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete basic auth (missing password)', () => {
      const result = validate({
        user: 'username',
        password: null,
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete basic auth (missing username)', () => {
      const result = validate({
        user: null,
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete SSL certificate (missing key)', () => {
      const result = validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: null,
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });

    it('should reject incomplete SSL certificate (missing certificate)', () => {
      const result = validate({
        user: null,
        password: null,
        crt: null,
        key: 'key-content',
        pfx: null,
        clientSecret: null,
      });
      expect(result).toBe(errorMessage);
    });
  });
});

describe('WebhookSecretConfigurationSchemaValidation', () => {
  it('returns error if only clientSecret is provided with other fields', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({ clientSecret: 'secret', user: 'bob' })
    ).toThrow(/must specify one of the following schemas/);
  });

  it('accepts only clientSecret for OAuth2', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({ clientSecret: 'secret' })
    ).not.toThrow();
  });

  it('accepts only user and password for basic auth', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({ user: 'bob', password: 'secret' })
    ).not.toThrow();
  });

  it('accepts crt and key for SSL', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({ crt: 'crt', key: 'key' })
    ).not.toThrow();
  });

  it('accepts only pfx', () => {
    expect(() => WebhookSecretConfigurationSchema.validate({ pfx: 'pfx' })).not.toThrow();
  });

  it('returns error if nothing is provided', () => {
    expect(() => WebhookSecretConfigurationSchema.validate({})).not.toThrow(); // No auth is allowed
  });

  it('should reject mixed PFX certificate and OAuth2', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({
        user: null,
        password: null,
        crt: null,
        key: null,
        pfx: 'pfx-content',
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(
      'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or OAuth2 client secret'
    );
  });

  it('should reject mixed SSL certificate and OAuth2', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({
        user: null,
        password: null,
        crt: 'certificate-content',
        key: 'key-content',
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(
      'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or OAuth2 client secret'
    );
  });

  it('should reject mixed basic auth and OAuth2', () => {
    expect(() =>
      WebhookSecretConfigurationSchema.validate({
        user: 'username',
        password: 'password',
        crt: null,
        key: null,
        pfx: null,
        clientSecret: 'oauth2-client-secret',
      })
    ).toThrow(
      'must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or OAuth2 client secret'
    );
  });
});
