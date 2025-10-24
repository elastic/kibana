/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createBasicAuthHeader,
  createBearerTokenHeader,
  createApiKeyHeader,
  buildAuthHeaders,
} from './header_auth';
import type { MCPConnectorAuth } from './types';

describe('Header Authentication', () => {
  describe('createBasicAuthHeader', () => {
    it('should create valid basic auth header', () => {
      const header = createBasicAuthHeader('user', 'pass');

      expect(header.name).toBe('Authorization');
      expect(header.value).toMatch(/^Basic /);

      // Verify base64 encoding
      const base64Part = header.value.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString();
      expect(decoded).toBe('user:pass');
    });

    it('should handle special characters in credentials', () => {
      const header = createBasicAuthHeader('user@domain.com', 'p@ss:w0rd!');

      const base64Part = header.value.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString();
      expect(decoded).toBe('user@domain.com:p@ss:w0rd!');
    });

    it('should handle empty username', () => {
      const header = createBasicAuthHeader('', 'password');

      const base64Part = header.value.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString();
      expect(decoded).toBe(':password');
    });

    it('should handle empty password', () => {
      const header = createBasicAuthHeader('username', '');

      const base64Part = header.value.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString();
      expect(decoded).toBe('username:');
    });
  });

  describe('createBearerTokenHeader', () => {
    it('should create valid bearer token header', () => {
      const header = createBearerTokenHeader('abc123xyz');

      expect(header.name).toBe('Authorization');
      expect(header.value).toBe('Bearer abc123xyz');
    });

    it('should handle JWT tokens', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const header = createBearerTokenHeader(jwt);

      expect(header.value).toBe(`Bearer ${jwt}`);
    });

    it('should handle empty token', () => {
      const header = createBearerTokenHeader('');

      expect(header.value).toBe('Bearer ');
    });
  });

  describe('createApiKeyHeader', () => {
    it('should create default X-API-Key header', () => {
      const header = createApiKeyHeader('secret-key-123');

      expect(header.name).toBe('X-API-Key');
      expect(header.value).toBe('secret-key-123');
    });

    it('should create custom header name', () => {
      const header = createApiKeyHeader('secret-key-123', 'Authorization');

      expect(header.name).toBe('Authorization');
      expect(header.value).toBe('secret-key-123');
    });

    it('should handle various header names', () => {
      const testCases = [
        { headerName: 'X-Custom-Key', expected: 'X-Custom-Key' },
        { headerName: 'api_key', expected: 'api_key' },
        { headerName: 'X-Auth-Token', expected: 'X-Auth-Token' },
      ];

      testCases.forEach(({ headerName, expected }) => {
        const header = createApiKeyHeader('test-key', headerName);
        expect(header.name).toBe(expected);
      });
    });
  });

  describe('buildAuthHeaders', () => {
    describe('none auth type', () => {
      it('should return empty object', () => {
        const auth: MCPConnectorAuth = { type: 'none' };
        const headers = buildAuthHeaders(auth);

        expect(headers).toEqual({});
      });
    });

    describe('header auth type', () => {
      it('should build single header', () => {
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [{ name: 'Authorization', value: 'Bearer abc123' }],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers).toEqual({
          Authorization: 'Bearer abc123',
        });
      });

      it('should build multiple headers', () => {
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [
            { name: 'Authorization', value: 'Bearer abc123' },
            { name: 'X-Client-ID', value: 'my-client' },
            { name: 'X-Request-ID', value: 'req-123' },
          ],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers).toEqual({
          Authorization: 'Bearer abc123',
          'X-Client-ID': 'my-client',
          'X-Request-ID': 'req-123',
        });
      });

      it('should handle empty headers array', () => {
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers).toEqual({});
      });

      it('should handle Basic auth header', () => {
        const basicHeader = createBasicAuthHeader('user', 'pass');
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [basicHeader],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers.Authorization).toMatch(/^Basic /);
      });

      it('should handle API key header', () => {
        const apiKeyHeader = createApiKeyHeader('secret-key');
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [apiKeyHeader],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers['X-API-Key']).toBe('secret-key');
      });

      it('should overwrite duplicate header names (last wins)', () => {
        const auth: MCPConnectorAuth = {
          type: 'header',
          headers: [
            { name: 'Authorization', value: 'Bearer first' },
            { name: 'Authorization', value: 'Bearer second' },
          ],
        };

        const headers = buildAuthHeaders(auth);

        expect(headers.Authorization).toBe('Bearer second');
      });
    });

    describe('oauth auth type', () => {
      it('should throw error for OAuth (not implemented)', () => {
        const auth: MCPConnectorAuth = {
          type: 'oauth',
          oauthConfig: {
            discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
            clientId: 'my-client',
            scopes: ['read', 'write'],
          },
        };

        expect(() => buildAuthHeaders(auth)).toThrow('OAuth authentication is not yet implemented');
        expect(() => buildAuthHeaders(auth)).toThrow('Plan 003');
      });

      it('should throw error for OAuth without config', () => {
        const auth: MCPConnectorAuth = {
          type: 'oauth',
        };

        expect(() => buildAuthHeaders(auth)).toThrow('OAuth authentication is not yet implemented');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should support Basic auth workflow', () => {
      // 1. Create Basic auth header
      const basicHeader = createBasicAuthHeader('admin', 'secret123');

      // 2. Build auth config
      const auth: MCPConnectorAuth = {
        type: 'header',
        headers: [basicHeader],
      };

      // 3. Build headers for HTTP request
      const headers = buildAuthHeaders(auth);

      // 4. Verify headers are ready for HTTP client
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toMatch(/^Basic /);
    });

    it('should support Bearer token workflow', () => {
      // 1. Create Bearer token header
      const bearerHeader = createBearerTokenHeader('eyJhbGci...');

      // 2. Build auth config
      const auth: MCPConnectorAuth = {
        type: 'header',
        headers: [bearerHeader],
      };

      // 3. Build headers for HTTP request
      const headers = buildAuthHeaders(auth);

      // 4. Verify headers are ready for HTTP client
      expect(headers.Authorization).toBe('Bearer eyJhbGci...');
    });

    it('should support API key workflow', () => {
      // 1. Create API key header
      const apiKeyHeader = createApiKeyHeader('sk-abc123');

      // 2. Build auth config
      const auth: MCPConnectorAuth = {
        type: 'header',
        headers: [apiKeyHeader],
      };

      // 3. Build headers for HTTP request
      const headers = buildAuthHeaders(auth);

      // 4. Verify headers are ready for HTTP client
      expect(headers['X-API-Key']).toBe('sk-abc123');
    });

    it('should support custom header workflow', () => {
      // 1. Create custom headers
      const auth: MCPConnectorAuth = {
        type: 'header',
        headers: [
          { name: 'X-Custom-Auth', value: 'custom-value' },
          { name: 'X-Client-Version', value: '1.0.0' },
        ],
      };

      // 2. Build headers for HTTP request
      const headers = buildAuthHeaders(auth);

      // 3. Verify headers are ready for HTTP client
      expect(headers['X-Custom-Auth']).toBe('custom-value');
      expect(headers['X-Client-Version']).toBe('1.0.0');
    });

    it('should support no auth workflow', () => {
      // 1. Create no auth config
      const auth: MCPConnectorAuth = { type: 'none' };

      // 2. Build headers for HTTP request
      const headers = buildAuthHeaders(auth);

      // 3. Verify no headers added
      expect(headers).toEqual({});
      expect(Object.keys(headers)).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long API keys', () => {
      const longKey = 'a'.repeat(1000);
      const header = createApiKeyHeader(longKey);

      expect(header.value).toBe(longKey);
      expect(header.value.length).toBe(1000);
    });

    it('should handle special characters in header values', () => {
      const auth: MCPConnectorAuth = {
        type: 'header',
        headers: [{ name: 'X-Custom', value: 'value with spaces & special=chars' }],
      };

      const headers = buildAuthHeaders(auth);

      expect(headers['X-Custom']).toBe('value with spaces & special=chars');
    });

    it('should handle Unicode in credentials', () => {
      const header = createBasicAuthHeader('user', 'пароль');

      const base64Part = header.value.replace('Basic ', '');
      const decoded = Buffer.from(base64Part, 'base64').toString();
      expect(decoded).toBe('user:пароль');
    });
  });
});
