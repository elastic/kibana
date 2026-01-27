/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import { buildHeadersFromSecrets } from './auth_helpers';

describe('buildHeadersFromSecrets', () => {
  const baseConfig: MCPConnectorConfig = {
    serverUrl: 'https://example.com',
    hasAuth: true,
  };

  const emptySecrets: MCPConnectorSecrets = {};

  describe('no auth', () => {
    it('should return empty headers when hasAuth is false', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: false,
      };

      const headers = buildHeadersFromSecrets(emptySecrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when authType is none', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: true,
        authType: MCPAuthType.None,
      };

      const headers = buildHeadersFromSecrets(emptySecrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('bearer auth type', () => {
    it('should return Authorization header with Bearer token when token is provided', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Bearer,
      };
      const secrets: MCPConnectorSecrets = {
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
        authType: MCPAuthType.Bearer,
      };

      const headers = buildHeadersFromSecrets(emptySecrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when token is empty string', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Bearer,
      };
      const secrets: MCPConnectorSecrets = {
        token: '',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('apiKey auth type', () => {
    it('should return X-API-Key header with API key when using default header name', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.ApiKey,
      };
      const secrets: MCPConnectorSecrets = {
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
        authType: MCPAuthType.ApiKey,
        apiKeyHeaderName: 'X-Custom-API-Key',
      };
      const secrets: MCPConnectorSecrets = {
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
        authType: MCPAuthType.ApiKey,
      };

      const headers = buildHeadersFromSecrets(emptySecrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('basic auth type', () => {
    it('should return Authorization header with Basic auth when username and password are provided', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Basic,
      };
      const secrets: MCPConnectorSecrets = {
        user: 'testuser',
        password: 'testpass',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      // Basic auth is base64 encoded "username:password"
      const expectedCredentials = Buffer.from('testuser:testpass').toString('base64');
      expect(headers).toEqual({
        Authorization: `Basic ${expectedCredentials}`,
      });
    });

    it('should return empty headers when user is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Basic,
      };
      const secrets: MCPConnectorSecrets = {
        password: 'testpass',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should return empty headers when password is missing', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Basic,
      };
      const secrets: MCPConnectorSecrets = {
        user: 'testuser',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });

    it('should correctly encode special characters in credentials', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Basic,
      };
      const secrets: MCPConnectorSecrets = {
        user: 'user@example.com',
        password: 'p@ss:w0rd!',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      const expectedCredentials = Buffer.from('user@example.com:p@ss:w0rd!').toString('base64');
      expect(headers).toEqual({
        Authorization: `Basic ${expectedCredentials}`,
      });
    });

    it('should return empty headers when both user and password are empty strings', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Basic,
      };
      const secrets: MCPConnectorSecrets = {
        user: '',
        password: '',
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('secret headers', () => {
    it('should include secret headers in the result', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: true,
      };
      const secrets: MCPConnectorSecrets = {
        secretHeaders: {
          'X-Custom-Header-1': 'value1',
          'X-Custom-Header-2': 'value2',
        },
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Custom-Header-1': 'value1',
        'X-Custom-Header-2': 'value2',
      });
    });

    it('should merge secret headers with auth headers', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        authType: MCPAuthType.Bearer,
      };
      const secrets: MCPConnectorSecrets = {
        token: 'my-token',
        secretHeaders: {
          'X-Extra-Header': 'extra-value',
        },
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        Authorization: 'Bearer my-token',
        'X-Extra-Header': 'extra-value',
      });
    });

    it('should return empty headers when secretHeaders is undefined', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: true,
      };

      const headers = buildHeadersFromSecrets(emptySecrets, config);

      expect(headers).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle undefined authType with hasAuth true', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: true,
        // authType is undefined
      };
      const secrets: MCPConnectorSecrets = {
        secretHeaders: {
          'X-Header': 'value',
        },
      };

      // Should still include secret headers even without a specific auth type
      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({
        'X-Header': 'value',
      });
    });

    it('should handle empty secretHeaders object', () => {
      const config: MCPConnectorConfig = {
        ...baseConfig,
        hasAuth: true,
      };
      const secrets: MCPConnectorSecrets = {
        secretHeaders: {},
      };

      const headers = buildHeadersFromSecrets(secrets, config);

      expect(headers).toEqual({});
    });
  });
});
