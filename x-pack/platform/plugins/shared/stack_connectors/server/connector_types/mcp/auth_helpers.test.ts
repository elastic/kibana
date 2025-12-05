/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { buildHeadersFromSecrets } from './auth_helpers';

describe('buildHeadersFromSecrets', () => {
  const baseConfig: MCPConnectorConfig = {
    service: {
      http: {
        url: 'https://example.com',
      },
      authType: 'none',
    },
  };

  describe('none auth type', () => {
    it('should return empty headers when authType is none', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'none',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('bearer auth type', () => {
    it('should return Authorization header with Bearer token when token is provided', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'bearer',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'bearer',
        token: 'test-token-123',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        Authorization: 'Bearer test-token-123',
      });
    });

    it('should return empty headers when token is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'bearer',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'bearer',
        // @ts-expect-error - testing missing token
        token: undefined,
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when secrets authType does not match config', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'bearer',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('apiKey auth type', () => {
    it('should return X-API-Key header with API key when using default header name', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'apiKey',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'apiKey',
        apiKey: 'test-api-key-456',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-API-Key': 'test-api-key-456',
      });
    });

    it('should return custom header name when apiKeyHeaderName is specified', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'apiKey',
          apiKeyHeaderName: 'X-Custom-API-Key',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'apiKey',
        apiKey: 'test-api-key-789',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Custom-API-Key': 'test-api-key-789',
      });
    });

    it('should return empty headers when apiKey is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'apiKey',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'apiKey',
        // @ts-expect-error - testing missing apiKey
        apiKey: undefined,
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when secrets authType does not match config', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'apiKey',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('basic auth type', () => {
    it('should return Authorization header with Basic auth when username and password are provided', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'basic',
        username: 'testuser',
        password: 'testpass',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      // Basic auth is base64 encoded "username:password"
      const expectedCredentials = Buffer.from('testuser:testpass').toString('base64');
      expect(headers).toEqual({
        Authorization: `Basic ${expectedCredentials}`,
      });
    });

    it('should return empty headers when username is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'basic',
        // @ts-expect-error - testing missing username
        username: undefined,
        password: 'testpass',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when password is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'basic',
        username: 'testuser',
        // @ts-expect-error - testing missing password
        password: undefined,
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should correctly encode special characters in credentials', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'basic',
        username: 'user@example.com',
        password: 'p@ss:w0rd!',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      const expectedCredentials = Buffer.from('user@example.com:p@ss:w0rd!').toString('base64');
      expect(headers).toEqual({
        Authorization: `Basic ${expectedCredentials}`,
      });
    });

    it('should return empty headers when secrets authType does not match config', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('customHeaders auth type', () => {
    it('should return all custom headers when headers array is provided', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'customHeaders',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'customHeaders',
        headers: [
          { name: 'X-Custom-Header-1', value: 'value1' },
          { name: 'X-Custom-Header-2', value: 'value2' },
          { name: 'Authorization', value: 'Custom auth value' },
        ],
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Custom-Header-1': 'value1',
        'X-Custom-Header-2': 'value2',
        Authorization: 'Custom auth value',
      });
    });

    it('should return empty headers when headers array is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'customHeaders',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'customHeaders',
        // @ts-expect-error - testing missing headers
        headers: undefined,
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when secrets authType does not match config', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'customHeaders',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should handle single custom header', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'customHeaders',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'customHeaders',
        headers: [{ name: 'X-Single-Header', value: 'single-value' }],
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Single-Header': 'single-value',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported auth type', () => {
      const config = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'unsupported' as MCPConnectorConfig['service']['authType'],
        },
      } as MCPConnectorConfig;
      const secrets: MCPConnectorSecrets = {
        authType: 'none',
      };

      expect(() => buildHeadersFromSecrets(secrets, config)).toThrow(
        'Unsupported auth type: unsupported'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values in custom headers', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'customHeaders',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'customHeaders',
        headers: [
          { name: 'X-Empty-Value', value: '' },
          { name: 'X-Normal-Value', value: 'normal' },
        ],
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Empty-Value': '',
        'X-Normal-Value': 'normal',
      });
    });

    it('should handle empty bearer token string', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'bearer',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'bearer',
        token: '',
      };

      // Empty string is falsy, so it should return empty headers
      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should handle empty basic auth credentials', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        service: {
          ...baseConfig.service,
          authType: 'basic',
        },
      };
      const secrets: MCPConnectorSecrets = {
        authType: 'basic',
        username: '',
        password: '',
      };

      // Empty strings are falsy, so it should return empty headers
      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });
});
