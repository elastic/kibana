/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { generateConfigSchema } from './generate_config_schema';
import { actionsConfigMock } from '../../actions_config.mock';

const mockConfigUtils = actionsConfigMock.create();

const validatorServices = { configurationUtilities: mockConfigUtils };

beforeEach(() => {
  jest.resetAllMocks();
  mockConfigUtils.getWebhookSettings.mockReturnValue({ ssl: { pfx: { enabled: false } } });
});

describe('generateConfigSchema', () => {
  describe('customValidator - allowedHosts validation for URL fields', () => {
    it('calls ensureUriAllowed for uri formatted config fields when validate meta is set', () => {
      const validator = generateConfigSchema(
        z.object({
          serviceUrl: z.url().meta({ validate: { allowedHosts: true } }),
        })
      );

      validator.customValidator!(
        {
          authType: 'basic',
          serviceUrl: 'https://service.example.com/api',
        },
        validatorServices
      );

      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith(
        'https://service.example.com/api'
      );
    });

    it('throws when a config URL is not in allowedHosts', () => {
      mockConfigUtils.ensureUriAllowed.mockImplementation(() => {
        throw new Error(
          'target url "https://not-allowed.example.com" is not added to the Kibana config xpack.actions.allowedHosts'
        );
      });

      const validator = generateConfigSchema(
        z.object({
          serviceUrl: z.url().meta({ validate: { allowedHosts: true } }),
        })
      );

      expect(() =>
        validator.customValidator!(
          {
            authType: 'basic',
            serviceUrl: 'https://not-allowed.example.com',
          },
          validatorServices
        )
      ).toThrow(
        'target url "https://not-allowed.example.com" is not added to the Kibana config xpack.actions.allowedHosts'
      );
    });

    it('supports opting out via meta validate.allowedHosts=false', () => {
      mockConfigUtils.ensureUriAllowed.mockImplementation((uri: string) => {
        if (uri === 'https://not-allowed.example.com/webhook') {
          throw new Error(
            'target url "https://not-allowed.example.com/webhook" is not added to the Kibana config xpack.actions.allowedHosts'
          );
        }
      });

      const validator = generateConfigSchema(
        z.object({
          serviceUrl: z.url().meta({ validate: { allowedHosts: true } }),
          optionalWebhookUrl: z.url().meta({ validate: { allowedHosts: false } }),
        })
      );

      expect(() =>
        validator.customValidator!(
          {
            authType: 'basic',
            serviceUrl: 'https://allowed.example.com',
            optionalWebhookUrl: 'https://not-allowed.example.com/webhook',
          },
          validatorServices
        )
      ).not.toThrow();

      expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith('https://allowed.example.com');
      expect(mockConfigUtils.ensureUriAllowed).not.toHaveBeenCalledWith(
        'https://not-allowed.example.com/webhook'
      );
    });
  });
});
