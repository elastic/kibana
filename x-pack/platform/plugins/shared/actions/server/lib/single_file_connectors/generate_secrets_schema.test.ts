/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { generateSecretsSchema } from './generate_secrets_schema';
import { actionsConfigMock } from '../../actions_config.mock';

const mockConfigUtils = actionsConfigMock.create();

const validatorServices = { configurationUtilities: mockConfigUtils };

beforeEach(() => {
  jest.resetAllMocks();
  mockConfigUtils.getWebhookSettings.mockReturnValue({ ssl: { pfx: { enabled: false } } });
});

describe('generateSecretsSchema', () => {
  it('returns schema from generateSecretsSchemaFromSpec', () => {
    const authSpec: ConnectorSpec['auth'] = {
      types: ['none'],
    };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(result.schema).toBeDefined();
    expect(result.schema.parse({ authType: 'none' })).toEqual({ authType: 'none' });
  });

  it('passes isPfxEnabled from webhook settings to generateSecretsSchemaFromSpec', () => {
    mockConfigUtils.getWebhookSettings.mockReturnValue({
      ssl: {
        pfx: {
          enabled: false,
        },
      },
    });

    const authSpec: ConnectorSpec['auth'] = {
      types: ['none', 'basic'],
    };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(mockConfigUtils.getWebhookSettings).toHaveBeenCalled();
    expect(result.schema).toBeDefined();
  });

  it('parses valid secrets for none auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['none'] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(result.schema.parse({ authType: 'none' })).toEqual({ authType: 'none' });
  });

  it('parses valid secrets for basic auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    const secrets = { authType: 'basic' as const, username: 'testuser', password: 'testpass' };
    expect(result.schema.parse(secrets)).toEqual(secrets);
  });

  it('parses valid secrets for bearer auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['bearer'] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    const secrets = { authType: 'bearer' as const, token: 'test-token' };
    expect(result.schema.parse(secrets)).toEqual(secrets);
  });

  it('rejects invalid secrets with wrong authType', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(() =>
      result.schema.parse({ authType: 'invalid_type', username: 'u', password: 'p' })
    ).toThrow();
  });

  it('rejects invalid secrets with missing required fields', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(() => result.schema.parse({ authType: 'basic', username: 'testuser' })).toThrow(
      /password|Required/
    );
  });

  it('returns empty object schema when no auth types are provided', () => {
    const authSpec: ConnectorSpec['auth'] = { types: [] };
    const result = generateSecretsSchema(authSpec, mockConfigUtils);

    expect(result.schema.parse({})).toEqual({});
  });

  it('returns empty object schema when auth is undefined', () => {
    const result = generateSecretsSchema(
      undefined as unknown as ConnectorSpec['auth'],
      mockConfigUtils
    );

    expect(result.schema.parse({})).toEqual({});
  });

  describe('customValidator - EARS auth gating', () => {
    const earsAuthSpec: ConnectorSpec['auth'] = {
      types: ['none', 'ears'],
    };

    it('throws when EARS is disabled', () => {
      mockConfigUtils.isEarsEnabled.mockReturnValue(false);
      const validator = generateSecretsSchema(earsAuthSpec, mockConfigUtils);

      expect(() =>
        validator.customValidator!({ authType: 'ears', provider: 'google' }, validatorServices)
      ).toThrow(
        'EARS OAuth authentication is not enabled. Enable it via xpack.actions.ears.enabled in kibana.yml.'
      );
    });

    it('does not throw when EARS is enabled', () => {
      mockConfigUtils.isEarsEnabled.mockReturnValue(true);
      const validator = generateSecretsSchema(earsAuthSpec, mockConfigUtils);

      expect(() =>
        validator.customValidator!({ authType: 'ears', provider: 'google' }, validatorServices)
      ).not.toThrow();
    });

    it('does not check EARS when authType is not ears', () => {
      mockConfigUtils.isEarsEnabled.mockReturnValue(false);
      const validator = generateSecretsSchema(earsAuthSpec, mockConfigUtils);

      expect(() =>
        validator.customValidator!({ authType: 'none' }, validatorServices)
      ).not.toThrow();
    });
  });

  describe('customValidator - allowedHosts validation for URL fields', () => {
    const oauthAuthSpec = {
      types: [
        {
          type: 'oauth_authorization_code' as const,
          defaults: {
            authorizationUrl: 'https://provider.example.com/authorize',
            tokenUrl: 'https://provider.example.com/token',
          },
        },
      ],
    };

    it('calls ensureUriAllowed for authorizationUrl', () => {
      const validator = generateSecretsSchema(oauthAuthSpec, mockConfigUtils);

      validator.customValidator!(
        {
          authType: 'oauth_authorization_code',
          authorizationUrl: 'https://provider.example.com/authorize',
          tokenUrl: 'https://provider.example.com/token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
        validatorServices
      );

      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://provider.example.com/authorize'
      );
      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://provider.example.com/token'
      );
    });

    it('validates URL defaults for the selected authType', () => {
      const validator = generateSecretsSchema(
        {
          types: [
            {
              type: 'oauth_authorization_code' as const,
              defaults: {
                authorizationUrl: 'https://provider.example.com/authorize',
                tokenUrl: 'https://provider.example.com/token',
                clientId: 'default-client-id',
              },
            },
          ],
        },
        mockConfigUtils
      );

      const parsedSecrets = validator.schema.parse({
        authType: 'oauth_authorization_code',
        clientSecret: 'client-secret',
      });

      validator.customValidator!(parsedSecrets as Record<string, unknown>, validatorServices);

      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://provider.example.com/authorize'
      );
      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://provider.example.com/token'
      );
    });

    it('throws when authorizationUrl is not in allowedHosts', () => {
      mockConfigUtils.ensureUriAllowed.mockImplementation(() => {
        throw new Error(
          'target url "https://not-allowed.example.com/authorize" is not added to the Kibana config xpack.actions.allowedHosts'
        );
      });

      const validator = generateSecretsSchema(oauthAuthSpec, mockConfigUtils);

      expect(() =>
        validator.customValidator!(
          {
            authType: 'oauth_authorization_code',
            authorizationUrl: 'https://not-allowed.example.com/authorize',
            tokenUrl: 'https://provider.example.com/token',
            clientId: 'client-id',
            clientSecret: 'client-secret',
          },
          validatorServices
        )
      ).toThrow(
        'target url "https://not-allowed.example.com/authorize" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });

    it('throws when tokenUrl is not in allowedHosts', () => {
      mockConfigUtils.ensureUriAllowed
        .mockImplementationOnce(() => {})
        .mockImplementationOnce(() => {
          throw new Error(
            'target url "https://not-allowed.example.com/token" is not added to the Kibana config xpack.actions.allowedHosts'
          );
        });

      const validator = generateSecretsSchema(oauthAuthSpec, mockConfigUtils);

      expect(() =>
        validator.customValidator!(
          {
            authType: 'oauth_authorization_code',
            authorizationUrl: 'https://provider.example.com/authorize',
            tokenUrl: 'https://not-allowed.example.com/token',
            clientId: 'client-id',
            clientSecret: 'client-secret',
          },
          validatorServices
        )
      ).toThrow(
        'target url "https://not-allowed.example.com/token" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });

    it('does not validate when validate configuration is missing', () => {
      const validator = generateSecretsSchema({ types: ['basic'] }, mockConfigUtils);

      validator.customValidator!(
        {
          authType: 'basic',
          username: 'user',
          password: 'pass',
        },
        validatorServices
      );

      expect(mockConfigUtils.ensureUriAllowed).not.toHaveBeenCalled();
    });

    it('does not validate URL fields from non-selected auth types', () => {
      const validator = generateSecretsSchema(
        {
          types: [
            'basic',
            {
              type: 'oauth_authorization_code' as const,
              defaults: {
                authorizationUrl: 'https://provider.example.com/authorize',
                tokenUrl: 'https://provider.example.com/token',
              },
            },
          ],
        },
        mockConfigUtils
      );

      const parsedSecrets = validator.schema.parse({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });

      validator.customValidator!(parsedSecrets as Record<string, unknown>, validatorServices);

      expect(mockConfigUtils.ensureUriAllowed).not.toHaveBeenCalled();
    });

    it('supports opting out via meta.validate.allowedHosts=false', () => {
      mockConfigUtils.ensureUriAllowed.mockImplementation((uri: string) => {
        if (uri === 'https://not-allowed.example.com/token') {
          throw new Error(
            'target url "https://not-allowed.example.com/token" is not added to the Kibana config xpack.actions.allowedHosts'
          );
        }
      });

      const validator = generateSecretsSchema(
        {
          types: [
            {
              type: 'oauth_authorization_code' as const,
              defaults: {
                authorizationUrl: 'https://provider.example.com/authorize',
                tokenUrl: 'https://provider.example.com/token',
              },
              overrides: {
                meta: {
                  tokenUrl: { validate: { allowedHosts: false } },
                },
              },
            },
          ],
        },
        mockConfigUtils
      );

      expect(() =>
        validator.customValidator!(
          {
            authType: 'oauth_authorization_code',
            authorizationUrl: 'https://provider.example.com/authorize',
            tokenUrl: 'https://not-allowed.example.com/token',
            clientId: 'client-id',
            clientSecret: 'client-secret',
          },
          validatorServices
        )
      ).not.toThrow();

      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://provider.example.com/authorize'
      );
      expect(mockConfigUtils.ensureUriAllowed).not.toHaveBeenCalledWith(
        'https://not-allowed.example.com/token'
      );
    });
  });
});
