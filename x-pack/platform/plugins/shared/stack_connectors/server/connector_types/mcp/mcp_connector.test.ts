/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MCPConnector } from './mcp_connector';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import type {
  MCPConnectorConfig,
  MCPConnectorSecrets,
  MCPConnectorSecretsNone,
  MCPConnectorSecretsBearer,
  MCPConnectorSecretsApiKey,
  MCPConnectorSecretsBasic,
  MCPConnectorSecretsCustomHeaders,
} from '@kbn/mcp-connector-common';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ConnectorTokenClientContract, Services } from '@kbn/actions-plugin/server/types';
import type { ConnectorTokenClient } from '@kbn/actions-plugin/server/lib/connector_token_client';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js');

// Capture transport options for testing
let capturedTransportOptions: { url: URL; requestInit?: RequestInit } | null = null;

jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  return {
    StreamableHTTPClientTransport: jest.fn().mockImplementation((url, options) => {
      capturedTransportOptions = { url, ...options };
      return {
        url,
        options,
      };
    }),
  };
});

describe('MCPConnector authentication', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockConfigurationUtilities = actionsConfigMock.create();

  let mockConnect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedTransportOptions = null;

    // Mock Client.connect
    mockConnect = jest.fn().mockResolvedValue(undefined);

    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => {
      return {
        connect: mockConnect,
        listTools: jest.fn().mockResolvedValue({ tools: [], nextCursor: undefined }),
        callTool: jest.fn(),
      } as never;
    });
  });

  const createConnector = (config: MCPConnectorConfig, secrets: MCPConnectorSecrets) => {
    const mockConnectorTokenClient: ConnectorTokenClient = {
      get: jest.fn().mockRejectedValue(new Error('No cache')),
      updateOrReplace: jest.fn().mockResolvedValue(undefined),
      deleteConnectorTokens: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConnectorTokenClient;

    const params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets> = {
      connector: {
        id: 'test-connector-id',
        type: '.mcp',
      },
      config,
      secrets,
      logger: mockLogger,
      configurationUtilities: mockConfigurationUtilities,
      services: {
        connectorTokenClient: mockConnectorTokenClient,
      } as unknown as Services,
    };

    return new MCPConnector(params);
  };

  describe('none authentication', () => {
    it('should handle no authentication', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'none',
        },
      };

      const secrets: MCPConnectorSecretsNone = {
        authType: 'none',
      };

      const connector = createConnector(config, secrets);

      // Call listTools which triggers connect
      await connector.listTools();

      // Verify connect was called
      expect(mockConnect).toHaveBeenCalledTimes(1);

      // Verify no auth headers were set
      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.has('Authorization')).toBe(false);
      expect(headers.has('X-API-Key')).toBe(false);
    });
  });

  describe('bearer token authentication', () => {
    it('should handle bearer token authentication', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'bearer',
        },
      };

      const secrets: MCPConnectorSecretsBearer = {
        authType: 'bearer',
        token: 'test-token-123',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
    });
  });

  describe('API key authentication', () => {
    it('should handle API key with default header', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'apiKey',
        },
      };

      const secrets: MCPConnectorSecretsApiKey = {
        authType: 'apiKey',
        apiKey: 'test-api-key',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('X-API-Key')).toBe('test-api-key');
    });

    it('should handle API key with custom header name', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'apiKey',
          apiKeyHeaderName: 'X-Custom-Key',
        },
      };

      const secrets: MCPConnectorSecretsApiKey = {
        authType: 'apiKey',
        apiKey: 'test-api-key',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('X-Custom-Key')).toBe('test-api-key');
      expect(headers.has('X-API-Key')).toBe(false);
    });

    it('should handle API key with Authorization header name', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'apiKey',
          apiKeyHeaderName: 'Authorization',
        },
      };

      const secrets: MCPConnectorSecretsApiKey = {
        authType: 'apiKey',
        apiKey: 'test-api-key',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('Authorization')).toBe('test-api-key');
    });
  });

  describe('basic authentication', () => {
    it('should handle basic authentication', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'basic',
        },
      };

      const secrets: MCPConnectorSecretsBasic = {
        authType: 'basic',
        username: 'user',
        password: 'pass',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();

      // dXNlcjpwYXNz is base64 encoding of "user:pass"
      expect(headers.get('Authorization')).toBe('Basic dXNlcjpwYXNz');
    });

    it('should handle special characters in credentials', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'basic',
        },
      };

      const secrets: MCPConnectorSecretsBasic = {
        authType: 'basic',
        username: 'user@example.com',
        password: 'p@ss:w0rd!',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();

      // Verify base64 encoding is correct
      const authValue = headers.get('Authorization');
      expect(authValue).toMatch(/^Basic /);

      const base64Part = authValue?.replace('Basic ', '');
      const decoded = Buffer.from(base64Part!, 'base64').toString('utf-8');
      expect(decoded).toBe('user@example.com:p@ss:w0rd!');
    });
  });

  describe('custom headers authentication', () => {
    it('should handle custom headers', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'customHeaders',
        },
      };

      const secrets: MCPConnectorSecretsCustomHeaders = {
        authType: 'customHeaders',
        headers: [
          { name: 'X-Custom-1', value: 'value1' },
          { name: 'X-Custom-2', value: 'value2' },
        ],
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('X-Custom-1')).toBe('value1');
      expect(headers.get('X-Custom-2')).toBe('value2');
    });

    it('should handle single custom header', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'customHeaders',
        },
      };

      const secrets: MCPConnectorSecretsCustomHeaders = {
        authType: 'customHeaders',
        headers: [{ name: 'X-API-Token', value: 'custom-token-value' }],
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('X-API-Token')).toBe('custom-token-value');
    });

    it('should handle Authorization header in custom headers', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'customHeaders',
        },
      };

      const secrets: MCPConnectorSecretsCustomHeaders = {
        authType: 'customHeaders',
        headers: [{ name: 'Authorization', value: 'Custom auth-scheme custom-token' }],
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers).toBeDefined();
      expect(headers.get('Authorization')).toBe('Custom auth-scheme custom-token');
    });
  });

  describe('connection lifecycle', () => {
    it('should only connect once', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'none',
        },
      };

      const secrets: MCPConnectorSecretsNone = {
        authType: 'none',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();
      await connector.listTools();
      await connector.listTools();

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('secrets accessed correctly', () => {
    it('should access secrets from this.secrets, not config', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'bearer',
        },
      };

      const secrets: MCPConnectorSecretsBearer = {
        authType: 'bearer',
        token: 'token-from-secrets',
      };

      const connector = createConnector(config, secrets);

      await connector.listTools();

      const headers = capturedTransportOptions?.requestInit?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token-from-secrets');

      // Verify config doesn't have token
      expect((config.service as { token?: string }).token).toBeUndefined();
    });
  });

  describe('listTools caching with forceRefresh', () => {
    let mockListTools: jest.Mock;
    let mockConnectorTokenClient: jest.Mocked<ConnectorTokenClientContract>;

    beforeEach(() => {
      mockListTools = jest.fn().mockResolvedValue({
        tools: [
          { name: 'tool1', description: 'Test tool 1' },
          { name: 'tool2', description: 'Test tool 2' },
        ],
        nextCursor: undefined,
      });

      (Client as jest.MockedClass<typeof Client>).mockImplementation(() => {
        return {
          connect: mockConnect,
          listTools: mockListTools,
          callTool: jest.fn(),
        } as never;
      });

      mockConnectorTokenClient = {
        get: jest.fn().mockRejectedValue(new Error('No cache')),
        updateOrReplace: jest.fn().mockResolvedValue(undefined),
        deleteConnectorTokens: jest.fn().mockResolvedValue(undefined),
        getInstance: jest.fn(),
      } as unknown as jest.Mocked<ConnectorTokenClientContract>;
    });

    it('should use cached tools on subsequent calls without forceRefresh', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'none',
        },
      };

      const secrets: MCPConnectorSecretsNone = {
        authType: 'none',
      };

      const connector = createConnector(config, secrets);

      const result1 = await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(1);
      expect(result1.tools).toHaveLength(2);

      const result2 = await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(1);
      expect(result2.tools).toHaveLength(2);

      const result3 = await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(1);
      expect(result3.tools).toHaveLength(2);
    });

    it('should force refresh cache when forceRefresh is true', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'none',
        },
      };

      const secrets: MCPConnectorSecretsNone = {
        authType: 'none',
      };

      const params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets> = {
        connector: {
          id: 'test-connector-id',
          type: '.mcp',
        },
        config,
        secrets,
        logger: mockLogger,
        configurationUtilities: mockConfigurationUtilities,
        services: {
          connectorTokenClient: mockConnectorTokenClient,
        } as unknown as Services,
      };

      const connector = new MCPConnector(params);

      const result1 = await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(1);
      expect(result1.tools).toHaveLength(2);

      const result2 = await connector.listTools({ forceRefresh: true });
      expect(mockListTools).toHaveBeenCalledTimes(2); // Called again
      expect(result2.tools).toHaveLength(2);
      expect(mockConnectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
        connectorId: 'test-connector-id',
      });

      const result3 = await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(2); // Not called again
      expect(result3.tools).toHaveLength(2);
    });

    it('should handle cache deletion errors gracefully when forceRefresh is true', async () => {
      const config: MCPConnectorConfig = {
        service: {
          http: { url: 'https://mcp.test' },
          authType: 'none',
        },
      };

      const secrets: MCPConnectorSecretsNone = {
        authType: 'none',
      };

      mockConnectorTokenClient.deleteConnectorTokens.mockRejectedValue(
        new Error('Failed to delete cache')
      );

      const params: ServiceParams<MCPConnectorConfig, MCPConnectorSecrets> = {
        connector: {
          id: 'test-connector-id',
          type: '.mcp',
        },
        config,
        secrets,
        logger: mockLogger,
        configurationUtilities: mockConfigurationUtilities,
        services: {
          connectorTokenClient: mockConnectorTokenClient,
        } as unknown as Services,
      };

      const connector = new MCPConnector(params);

      await connector.listTools();
      expect(mockListTools).toHaveBeenCalledTimes(1);

      const result = await connector.listTools({ forceRefresh: true });
      expect(mockListTools).toHaveBeenCalledTimes(2); // Called again
      expect(result.tools).toHaveLength(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to clear persistent cache/)
      );
    });
  });
});
