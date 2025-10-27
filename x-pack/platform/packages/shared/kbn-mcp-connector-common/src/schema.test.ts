/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      const result = MCPConnectorSecretsSchema.validate({ authType: 'none' });
      expect(result).toEqual({ authType: 'none' });
    });

    it('should validate with MCPConnectorSecretsNoneSchema', () => {
      const result = MCPConnectorSecretsNoneSchema.validate({ authType: 'none' });
      expect(result).toEqual({ authType: 'none' });
    });
  });

  describe('bearer authentication', () => {
    it('should validate bearer with token', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'bearer',
        token: 'test-token',
      });
      expect(result).toEqual({ authType: 'bearer', token: 'test-token' });
    });

    it('should validate with MCPConnectorSecretsBearerSchema', () => {
      const result = MCPConnectorSecretsBearerSchema.validate({
        authType: 'bearer',
        token: 'test-token',
      });
      expect(result).toEqual({ authType: 'bearer', token: 'test-token' });
    });

    it('should reject bearer without token', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 'bearer' });
      }).toThrow();
    });

    it('should reject bearer with empty token', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 'bearer', token: '' });
      }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
    });

    it('should accept bearer with long token', () => {
      const longToken = 'a'.repeat(1000);
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'bearer',
        token: longToken,
      });
      expect(result.token).toBe(longToken);
    });
  });

  describe('apiKey authentication', () => {
    it('should validate apiKey with key', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'apiKey',
        apiKey: 'test-key',
      });
      expect(result).toEqual({ authType: 'apiKey', apiKey: 'test-key' });
    });

    it('should validate with MCPConnectorSecretsApiKeySchema', () => {
      const result = MCPConnectorSecretsApiKeySchema.validate({
        authType: 'apiKey',
        apiKey: 'test-key',
      });
      expect(result).toEqual({ authType: 'apiKey', apiKey: 'test-key' });
    });

    it('should reject apiKey without key', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 'apiKey' });
      }).toThrow();
    });

    it('should reject apiKey with empty key', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 'apiKey', apiKey: '' });
      }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
    });

    it('should accept apiKey with special characters', () => {
      const specialKey = 'key-with-special_chars.123!@#$%';
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'apiKey',
        apiKey: specialKey,
      });
      expect(result.apiKey).toBe(specialKey);
    });
  });

  describe('basic authentication', () => {
    it('should validate basic with username and password', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
      expect(result).toEqual({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
    });

    it('should validate with MCPConnectorSecretsBasicSchema', () => {
      const result = MCPConnectorSecretsBasicSchema.validate({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
      expect(result).toEqual({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });
    });

    it('should reject basic without password', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'basic',
          username: 'user',
        });
      }).toThrow();
    });

    it('should reject basic without username', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'basic',
          password: 'pass',
        });
      }).toThrow();
    });

    it('should reject basic with empty username', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'basic',
          username: '',
          password: 'pass',
        });
      }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
    });

    it('should reject basic with empty password', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'basic',
          username: 'user',
          password: '',
        });
      }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
    });

    it('should accept basic with special characters in username', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'basic',
        username: 'user@example.com',
        password: 'pass',
      });
      expect(result.username).toBe('user@example.com');
    });

    it('should accept basic with special characters in password', () => {
      const specialPassword = 'p@ssw0rd!#$%^&*()';
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'basic',
        username: 'user',
        password: specialPassword,
      });
      expect(result.password).toBe(specialPassword);
    });

    it('should accept basic with unicode characters', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'basic',
        username: 'utilisateur',
        password: 'mot_de_passe_français',
      });
      expect(result.username).toBe('utilisateur');
      expect(result.password).toBe('mot_de_passe_français');
    });
  });

  describe('customHeaders authentication', () => {
    it('should validate custom headers array', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers: [
          { name: 'X-Custom-1', value: 'value1' },
          { name: 'X-Custom-2', value: 'value2' },
        ],
      });
      expect(result.headers).toHaveLength(2);
      expect(result.headers[0]).toEqual({ name: 'X-Custom-1', value: 'value1' });
      expect(result.headers[1]).toEqual({ name: 'X-Custom-2', value: 'value2' });
    });

    it('should validate with MCPConnectorSecretsCustomHeadersSchema', () => {
      const result = MCPConnectorSecretsCustomHeadersSchema.validate({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: 'value' }],
      });
      expect(result.headers).toHaveLength(1);
      expect(result.headers[0]).toEqual({ name: 'X-Custom', value: 'value' });
    });

    it('should reject empty headers array', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'customHeaders',
          headers: [],
        });
      }).toThrow(/array size is \[0\], but cannot be smaller than \[1\]/);
    });

    it('should reject headers with empty name', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'customHeaders',
          headers: [{ name: '', value: 'value' }],
        });
      }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
    });

    it('should allow headers with empty value', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: '' }],
      });
      expect(result.headers[0]).toEqual({ name: 'X-Custom', value: '' });
    });

    it('should reject headers without name field', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'customHeaders',
          headers: [{ value: 'value' }],
        });
      }).toThrow();
    });

    it('should reject headers without value field', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({
          authType: 'customHeaders',
          headers: [{ name: 'X-Custom' }],
        });
      }).toThrow();
    });

    it('should accept multiple headers', () => {
      const headers = [
        { name: 'Authorization', value: 'Bearer token' },
        { name: 'X-API-Key', value: 'key123' },
        { name: 'X-Custom-Header', value: 'custom' },
      ];
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers,
      });
      expect(result.headers).toHaveLength(3);
      expect(result.headers).toEqual(headers);
    });

    it('should accept headers with special characters in name', () => {
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom-Header_123', value: 'value' }],
      });
      expect(result.headers[0].name).toBe('X-Custom-Header_123');
    });

    it('should accept headers with special characters in value', () => {
      const specialValue = 'value with spaces and symbols: !@#$%^&*()';
      const result = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: specialValue }],
      });
      expect(result.headers[0].value).toBe(specialValue);
    });
  });

  describe('invalid authType', () => {
    it('should reject unknown authType', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 'unknown' });
      }).toThrow();
    });

    it('should reject missing authType', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ token: 'test' });
      }).toThrow();
    });

    it('should reject null authType', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: null });
      }).toThrow();
    });

    it('should reject authType as number', () => {
      expect(() => {
        MCPConnectorSecretsSchema.validate({ authType: 123 });
      }).toThrow();
    });
  });
});

describe('MCPConnectorHTTPServiceConfigSchema', () => {
  it('should validate config with authType', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.validate({
      http: { url: 'https://mcp.test' },
      authType: 'bearer',
    });
    expect(result.authType).toBe('bearer');
    expect(result.http.url).toBe('https://mcp.test');
  });

  it('should validate config with optional apiKeyHeaderName', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.validate({
      http: { url: 'https://mcp.test' },
      authType: 'apiKey',
      apiKeyHeaderName: 'X-Custom-Key',
    });
    expect(result.apiKeyHeaderName).toBe('X-Custom-Key');
  });

  it('should allow apiKeyHeaderName to be undefined', () => {
    const result = MCPConnectorHTTPServiceConfigSchema.validate({
      http: { url: 'https://mcp.test' },
      authType: 'apiKey',
    });
    expect(result.apiKeyHeaderName).toBeUndefined();
  });

  it('should reject empty apiKeyHeaderName', () => {
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'apiKey',
        apiKeyHeaderName: '',
      });
    }).toThrow(/value has length \[0\] but it must have a minimum length of \[1\]/);
  });

  it('should reject invalid authType', () => {
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'invalid',
      });
    }).toThrow();
  });

  it('should reject missing authType', () => {
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
      });
    }).toThrow();
  });

  it('should reject missing http field', () => {
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        authType: 'bearer',
      });
    }).toThrow();
  });

  it('should reject missing url in http', () => {
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        http: {},
        authType: 'bearer',
      });
    }).toThrow();
  });

  it('should accept empty url (validation done elsewhere)', () => {
    // Note: URL validation is lenient at schema level, actual URL validation
    // happens at connection time
    const result = MCPConnectorHTTPServiceConfigSchema.validate({
      http: { url: '' },
      authType: 'bearer',
    });
    expect(result.http.url).toBe('');
  });

  it('should allow all valid authTypes', () => {
    ['none', 'bearer', 'apiKey', 'basic', 'customHeaders'].forEach((authType) => {
      const result = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType,
      });
      expect(result.authType).toBe(authType);
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
      const result = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url },
        authType: 'none',
      });
      expect(result.http.url).toBe(url);
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
      const result = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'apiKey',
        apiKeyHeaderName: headerName,
      });
      expect(result.apiKeyHeaderName).toBe(headerName);
    });
  });

  it('should reject extra unknown fields', () => {
    // Note: @kbn/config-schema doesn't allow extra fields by default
    expect(() => {
      MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'bearer',
        extraField: 'not allowed',
      });
    }).toThrow();
  });

  describe('integration with secrets schema', () => {
    it('should work with matching none auth', () => {
      const config = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'none',
      });

      const secrets = MCPConnectorSecretsSchema.validate({
        authType: 'none',
      });

      expect(config.authType).toBe(secrets.authType);
    });

    it('should work with matching bearer auth', () => {
      const config = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'bearer',
      });

      const secrets = MCPConnectorSecretsSchema.validate({
        authType: 'bearer',
        token: 'test-token',
      });

      expect(config.authType).toBe(secrets.authType);
    });

    it('should work with matching apiKey auth', () => {
      const config = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'apiKey',
        apiKeyHeaderName: 'X-API-Key',
      });

      const secrets = MCPConnectorSecretsSchema.validate({
        authType: 'apiKey',
        apiKey: 'test-key',
      });

      expect(config.authType).toBe(secrets.authType);
    });

    it('should work with matching basic auth', () => {
      const config = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'basic',
      });

      const secrets = MCPConnectorSecretsSchema.validate({
        authType: 'basic',
        username: 'user',
        password: 'pass',
      });

      expect(config.authType).toBe(secrets.authType);
    });

    it('should work with matching customHeaders auth', () => {
      const config = MCPConnectorHTTPServiceConfigSchema.validate({
        http: { url: 'https://mcp.test' },
        authType: 'customHeaders',
      });

      const secrets = MCPConnectorSecretsSchema.validate({
        authType: 'customHeaders',
        headers: [{ name: 'X-Custom', value: 'value' }],
      });

      expect(config.authType).toBe(secrets.authType);
    });
  });
});
