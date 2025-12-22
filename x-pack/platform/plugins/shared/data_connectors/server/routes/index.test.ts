/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSecretsFromConnectorSpec } from '.';

jest.mock('@kbn/connector-specs', () => ({
  connectorsSpecs: {
    customConnectorWithBearerType: {
      metadata: { id: '.bearer_connector' },
      auth: {
        types: [
          {
            type: 'bearer',
          },
        ],
      },
    },
    customConnectorWithBearerString: {
      metadata: { id: '.bearer_string_connector' },
      auth: {
        types: ['bearer'],
      },
    },
    customConnectorWithApiKeyHeaderTypeAndCustomHeader: {
      metadata: { id: '.apikey_custom_header_connector' },
      auth: {
        types: [
          {
            type: 'api_key_header',
            defaults: {
              headerField: 'Key',
            },
          },
        ],
      },
    },
    customConnectorWithApiKeyHeaderType: {
      metadata: { id: '.apikey_header_connector' },
      auth: {
        types: [
          {
            type: 'api_key_header',
          },
        ],
      },
    },
    customConnectorWithApiKeyHeaderString: {
      metadata: { id: '.apikey_header_string_connector' },
      auth: {
        types: ['api_key_header'],
      },
    },
  },
}));

describe('buildSecretsFromConnectorSpec', () => {
  describe('bearer auth', () => {
    it('should return bearer auth secrets', () => {
      const actual = buildSecretsFromConnectorSpec('.bearer_connector', 'test-token-123');

      expect(actual).toEqual({
        authType: 'bearer',
        token: 'test-token-123',
      });
    });

    it('should handle bearer auth with string type definition', () => {
      const actual = buildSecretsFromConnectorSpec('.bearer_string_connector', 'my-bearer-token');

      expect(actual).toEqual({
        authType: 'bearer',
        token: 'my-bearer-token',
      });
    });
  });

  describe('api_key_header auth', () => {
    it('should return api_key_header secrets with custom headerField when present in the spec', () => {
      const actual = buildSecretsFromConnectorSpec(
        '.apikey_custom_header_connector',
        'api-key-456'
      );

      expect(actual).toEqual({
        authType: 'api_key_header',
        apiKey: 'api-key-456',
        headerField: 'Key',
      });
    });

    it('should use default fallback headerField when not specified in connector spec', () => {
      const expectedSecret = {
        authType: 'api_key_header',
        apiKey: 'test-key',
        headerField: 'ApiKey',
      };
      const actualFromType = buildSecretsFromConnectorSpec('.apikey_header_connector', 'test-key');
      const actualFromString = buildSecretsFromConnectorSpec(
        '.apikey_header_string_connector',
        'test-key'
      );

      expect(actualFromType).toEqual(expectedSecret);
      expect(actualFromString).toEqual(expectedSecret);
    });
  });

  describe('error cases', () => {
    it('should throw error for non-existent connector type', () => {
      expect(() => {
        buildSecretsFromConnectorSpec('.nonexistent', 'some-token');
      }).toThrow('Stack connector spec not found for type ".nonexistent"');
    });
  });
});
