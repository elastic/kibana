/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateSecretsSchema } from './generate_secrets_schema';
import { actionsConfigMock } from '../../actions_config.mock';

const mockConfigUtils = actionsConfigMock.create();

const validatorServices = { configurationUtilities: mockConfigUtils };

beforeEach(() => {
  jest.resetAllMocks();
  mockConfigUtils.getWebhookSettings.mockReturnValue({ ssl: { pfx: { enabled: false } } });
});

describe('generateSecretsSchema', () => {
  describe('customValidator - OAuth URL allowedHosts validation', () => {
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

      validator.customValidator!(parsedSecrets, validatorServices);

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
            authorizationUrl: 'https://not-allowed.example.com/authorize',
            tokenUrl: 'https://provider.example.com/token',
            clientId: 'client-id',
            clientSecret: 'client-secret',
          },
          validatorServices
        )
      ).toThrow('not added to the Kibana config xpack.actions.allowedHosts');
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
            authorizationUrl: 'https://provider.example.com/authorize',
            tokenUrl: 'https://not-allowed.example.com/token',
            clientId: 'client-id',
            clientSecret: 'client-secret',
          },
          validatorServices
        )
      ).toThrow('not added to the Kibana config xpack.actions.allowedHosts');
    });

    it('skips URL validation when neither authorizationUrl nor tokenUrl are present', () => {
      const validator = generateSecretsSchema(oauthAuthSpec, mockConfigUtils);

      validator.customValidator!({ clientId: 'id', clientSecret: 'secret' }, validatorServices);

      expect(mockConfigUtils.ensureUriAllowed).not.toHaveBeenCalled();
    });
  });
});
