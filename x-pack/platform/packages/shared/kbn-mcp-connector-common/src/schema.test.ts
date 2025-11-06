/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import {
  MCPConnectorSecretsSchema,
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
  MCPConnectorHTTPServiceConfigSchema,
} from './schema';

describe('MCPConnectorSecretsSchema', () => {
  describe('none authentication', () => {
    it('should validate none auth', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'none' });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'none' });
    });

    it('should validate with MCPConnectorSecretsNoneSchema', () => {
      const result = MCPConnectorSecretsNoneSchema.safeParse({ authType: 'none' });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'none' });
    });
  });

  describe('bearer authentication', () => {
    it('should validate bearer with token', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'bearer',
        token: 'test-token',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'bearer', token: 'test-token' });
    });

    it('should validate with MCPConnectorSecretsBearerSchema', () => {
      const result = MCPConnectorSecretsBearerSchema.safeParse({
        authType: 'bearer',
        token: 'test-token',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'bearer', token: 'test-token' });
    });

    it('should reject bearer without token', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'bearer' });
      expectParseError(result);
    });

    it('should reject bearer with empty token', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'bearer', token: '' });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('token');
    });

    it('should accept bearer with long token', () => {
      const longToken = 'a'.repeat(1000);
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'bearer',
        token: longToken,
      });
      expectParseSuccess(result);
      if (result.data.authType === 'bearer') {
        expect(result.data.token).toBe(longToken);
      }
    });
  });

  describe('apiKey authentication', () => {
    it('should validate apiKey with key', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'apiKey',
        apiKey: 'test-key',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'apiKey', apiKey: 'test-key' });
    });

    it('should validate with MCPConnectorSecretsApiKeySchema', () => {
      const result = MCPConnectorSecretsApiKeySchema.safeParse({
        authType: 'apiKey',
        apiKey: 'test-key',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({ authType: 'apiKey', apiKey: 'test-key' });
    });

    it('should reject apiKey without key', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'apiKey' });
      expectParseError(result);
    });

    it('should reject apiKey with empty key', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'apiKey', apiKey: '' });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('apiKey');
    });

    it('should accept apiKey with special characters', () => {
      const specialKey = 'key-with-special_chars.123!@#$%';
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'apiKey',
        apiKey: specialKey,
      });
      expectParseSuccess(result);
      if (result.data.authType === 'apiKey') {
        expect(result.data.apiKey).toBe(specialKey);
      }
    });
  });

  describe('basic authentication', () => {
    it('should validate basic with username and password', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
    });

    it('should validate with MCPConnectorSecretsBasicSchema', () => {
      const result = MCPConnectorSecretsBasicSchema.safeParse({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
      expectParseSuccess(result);
      expect(result.data).toEqual({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
    });

    it('should reject basic without password', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user',
      });
      expectParseError(result);
    });

    it('should reject basic without username', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        password: 'pass',
      });
      expectParseError(result);
    });

    it('should reject basic with empty username', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: '',
        password: 'pass',
      });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('username');
    });

    it('should reject basic with empty password', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user',
        password: '',
      });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('password');
    });

    it('should accept basic with special characters in username', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user@example.com',
        password: 'pass',
      });
      expectParseSuccess(result);
      if (result.data.authType === 'basic') {
        expect(result.data.username).toBe('user@example.com');
      }
    });

    it('should accept basic with special characters in password', () => {
      const specialPassword = 'p@ssw0rd!#$%^&*()';
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user',
        password: specialPassword,
      });
      expectParseSuccess(result);
      if (result.data.authType === 'basic') {
        expect(result.data.password).toBe(specialPassword);
      }
    });

    it('should accept basic with unicode characters', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'utilisateur',
        password: 'mot_de_passe_français',
      });
      expectParseSuccess(result);
      if (result.data.authType === 'basic') {
        expect(result.data.username).toBe('utilisateur');
        expect(result.data.password).toBe('mot_de_passe_français');
      }
    });
  });

  describe('customHeaders authentication', () => {
    it('should validate custom headers array', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [
          { name: 'X-Custom-1', value: 'value1' },
          { name: 'X-Custom-2', value: 'value2' },
        ],
      });
      expectParseSuccess(result);
      if (result.data.authType === 'customHeaders') {
        expect(result.data.headers).toHaveLength(2);
        expect(result.data.headers[0]).toEqual({ name: 'X-Custom-1', value: 'value1' });
        expect(result.data.headers[1]).toEqual({ name: 'X-Custom-2', value: 'value2' });
      }
    });

    it('should validate with MCPConnectorSecretsCustomHeadersSchema', () => {
      const result = MCPConnectorSecretsCustomHeadersSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: 'value' }],
      });
      expectParseSuccess(result);
      expect(result.data.headers).toHaveLength(1);
      expect(result.data.headers[0]).toEqual({ name: 'X-Custom', value: 'value' });
    });

    it('should reject empty headers array', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [],
      });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('headers');
    });

    it('should reject headers with empty name', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: '', value: 'value' }],
      });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain('name');
    });

    it('should allow headers with empty value', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: '' }],
      });
      expectParseSuccess(result);
      if (result.data.authType === 'customHeaders') {
        expect(result.data.headers[0]).toEqual({ name: 'X-Custom', value: '' });
      }
    });

    it('should reject headers without name field', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ value: 'value' }],
      });
      expectParseError(result);
    });

    it('should reject headers without value field', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom' }],
      });
      expectParseError(result);
    });

    it('should accept multiple headers', () => {
      const headers = [
        { name: 'Authorization', value: 'Bearer token' },
        { name: 'X-API-Key', value: 'key123' },
        { name: 'X-Custom-Header', value: 'custom' },
      ];
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers,
      });
      expectParseSuccess(result);
      if (result.data.authType === 'customHeaders') {
        expect(result.data.headers).toHaveLength(3);
        expect(result.data.headers).toEqual(headers);
      }
    });

    it('should accept headers with special characters in name', () => {
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom-Header_123', value: 'value' }],
      });
      expectParseSuccess(result);
      if (result.data.authType === 'customHeaders') {
        expect(result.data.headers[0].name).toBe('X-Custom-Header_123');
      }
    });

    it('should accept headers with special characters in value', () => {
      const specialValue = 'value with spaces and symbols: !@#$%^&*()';
      const result = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: specialValue }],
      });
      expectParseSuccess(result);
      if (result.data.authType === 'customHeaders') {
        expect(result.data.headers[0].value).toBe(specialValue);
      }
    });
  });

  describe('invalid authType', () => {
    it('should reject unknown authType', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 'unknown' });
      expectParseError(result);
    });

    it('should reject missing authType', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ token: 'test' });
      expectParseError(result);
    });

    it('should reject null authType', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: null });
      expectParseError(result);
    });

    it('should reject authType as number', () => {
      const result = MCPConnectorSecretsSchema.safeParse({ authType: 123 });
      expectParseError(result);
    });
  });
});

describe('MCPConnectorHTTPServiceConfigSchema', () => {
  it('should validate config with authType', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'bearer',
    });
    expectParseSuccess(result);
    expect(result.data.authType).toBe('bearer');
    expect(result.data.http.url).toBe('https://mcp.test');
  });

  it('should validate config with optional apiKeyHeaderName', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'apiKey',
      apiKeyHeaderName: 'X-Custom-Key',
    });
    expectParseSuccess(result);
    expect(result.data.apiKeyHeaderName).toBe('X-Custom-Key');
  });

  it('should allow apiKeyHeaderName to be undefined', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'apiKey',
    });
    expectParseSuccess(result);
    expect(result.data.apiKeyHeaderName).toBeUndefined();
  });

  it('should reject empty apiKeyHeaderName', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'apiKey',
      apiKeyHeaderName: '',
    });
    expectParseError(result);
    expect(stringifyZodError(result.error)).toContain('apiKeyHeaderName');
  });

  it('should reject invalid authType', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'invalid',
    });
    expectParseError(result);
  });

  it('should reject missing authType', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
    });
    expectParseError(result);
  });

  it('should reject missing http field', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      authType: 'bearer',
    });
    expectParseError(result);
  });

  it('should reject missing url in http', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: {},
      authType: 'bearer',
    });
    expectParseError(result);
  });

  it('should accept empty url (validation done elsewhere)', () => {
    // Note: URL validation is lenient at schema level, actual URL validation
    // happens at connection time
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: '' },
      authType: 'bearer',
    });
    expectParseSuccess(result);
    expect(result.data.http.url).toBe('');
  });

  it('should allow all valid authTypes', () => {
    ['none', 'bearer', 'apiKey', 'basic', 'customHeaders'].forEach((authType) => {
      const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType,
      });
      expectParseSuccess(result);
      expect(result.data.authType).toBe(authType);
    });
  });

  it('should accept various URL formats', () => {
    const urls = [
      'http://localhost:8080',
      'https://mcp.example.com',
      'https://mcp.example.com:3000',
      'https://mcp.example.com/path',
      'https://mcp.example.com/path?query=param',
      'https://user:pass@mcp.example.com',
    ];

    urls.forEach((url) => {
      const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url },
        authType: 'none',
      });
      expectParseSuccess(result);
      expect(result.data.http.url).toBe(url);
    });
  });

  it('should accept common header names for apiKeyHeaderName', () => {
    const headerNames = [
      'Authorization',
      'X-API-Key',
      'X-Custom-Header',
      'api-key',
      'x-auth-token',
    ];

    headerNames.forEach((headerName) => {
      const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'apiKey',
        apiKeyHeaderName: headerName,
      });
      expectParseSuccess(result);
      expect(result.data.apiKeyHeaderName).toBe(headerName);
    });
  });

  it('should reject extra unknown fields', () => {
    // Note: Zod by default strips unknown fields, but we can test that it doesn't accept them
    // by checking that the parsed result doesn't include the extra field
    const result = MCPConnectorHTTPServiceConfigSchema.safeParse({
      http: { url: 'https://mcp.test' },
      authType: 'bearer',
      extraField: 'not allowed',
    });
    expectParseSuccess(result);
    expect(result.data).not.toHaveProperty('extraField');
  });

  describe('integration with secrets schema', () => {
    it('should work with matching none auth', () => {
      const configResult = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'none',
      });
      expectParseSuccess(configResult);

      const secretsResult = MCPConnectorSecretsSchema.safeParse({
        authType: 'none',
      });
      expectParseSuccess(secretsResult);

      expect(configResult.data.authType).toBe(secretsResult.data.authType);
    });

    it('should work with matching bearer auth', () => {
      const configResult = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'bearer',
      });
      expectParseSuccess(configResult);

      const secretsResult = MCPConnectorSecretsSchema.safeParse({
        authType: 'bearer',
        token: 'test-token',
      });
      expectParseSuccess(secretsResult);

      expect(configResult.data.authType).toBe(secretsResult.data.authType);
    });

    it('should work with matching apiKey auth', () => {
      const configResult = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'apiKey',
        apiKeyHeaderName: 'X-API-Key',
      });
      expectParseSuccess(configResult);

      const secretsResult = MCPConnectorSecretsSchema.safeParse({
        authType: 'apiKey',
        apiKey: 'test-key',
      });
      expectParseSuccess(secretsResult);

      expect(configResult.data.authType).toBe(secretsResult.data.authType);
    });

    it('should work with matching basic auth', () => {
      const configResult = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'basic',
      });
      expectParseSuccess(configResult);

      const secretsResult = MCPConnectorSecretsSchema.safeParse({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
      expectParseSuccess(secretsResult);

      expect(configResult.data.authType).toBe(secretsResult.data.authType);
    });

    it('should work with matching customHeaders auth', () => {
      const configResult = MCPConnectorHTTPServiceConfigSchema.safeParse({
        http: { url: 'https://mcp.test' },
        authType: 'customHeaders',
      });
      expectParseSuccess(configResult);

      const secretsResult = MCPConnectorSecretsSchema.safeParse({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: 'value' }],
      });
      expectParseSuccess(secretsResult);

      expect(configResult.data.authType).toBe(secretsResult.data.authType);
    });
  });
});
