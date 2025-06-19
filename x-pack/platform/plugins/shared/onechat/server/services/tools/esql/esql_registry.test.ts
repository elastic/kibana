/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core/server';
import { createEsqlToolRegistry, EsqlToolRegistry } from './esql_registry';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { EsqlToolCreateRequest } from '../../../../common/tools';

describe('EsqlToolRegistry', () => {
  let registry: EsqlToolRegistry;
  let mockRequest: KibanaRequest;
  let elasticsearch: ElasticsearchServiceStart;
  let mockElasticsearchClient: any;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    elasticsearch = {
      client: {
        asInternalUser: mockElasticsearchClient,
        asCurrentUser: mockElasticsearchClient,
      },
    } as unknown as ElasticsearchServiceStart;

    registry = createEsqlToolRegistry(logger, elasticsearch);
    mockRequest = httpServerMock.createKibanaRequest();

    registry.getScopedClient = jest.fn().mockReturnValue(mockElasticsearchClient);
  });
  describe('register', () => {
    it('should register a tool', async () => {
      const now = new Date();
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool, request: mockRequest });
      await expect(registry.list({ request: mockRequest })).resolves.toEqual([mockTool]);
    });
  });

  describe('has', () => {
    it('should return true when tool exists', async () => {
      const now = new Date();
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool, request: mockRequest });
      const exists = await registry.has({ toolId: '123', request: mockRequest });
      expect(exists).toBe(true);
    });

    it('should return false when tool does not exist', async () => {
      const now = new Date();
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool, request: mockRequest });
      const exists = await registry.has({ toolId: 'non-existent-tool', request: mockRequest });
      expect(exists).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the tool when it exists', async () => {
      const now = new Date();
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool, request: mockRequest });
      const tool = await registry.get({ toolId: '123', request: mockRequest });
      expect(tool).toEqual(mockTool);
    });

    it('should throw an error when tool does not exist', async () => {
      const now = new Date();
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool, request: mockRequest });
      await expect(
        registry.get({ toolId: 'non-existent-tool', request: mockRequest })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('list', () => {
    it('should return all registered tools', async () => {
      const now = new Date();
      const mockTool1: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool-1',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const mockTool2: EsqlToolCreateRequest = {
        id: '456',
        name: 'test-tool-2',
        description: 'A test tool',
        query: 'SELECT * FROM test',
        params: {
          test: {
            type: 'keyword',
            description: 'test param description',
          },
        },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      registry.register({ tool: mockTool1, request: mockRequest });
      registry.register({ tool: mockTool2, request: mockRequest });

      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([mockTool1, mockTool2]);
    });

    it('should return empty array when no tools are registered', async () => {
      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([]);
    });
  });
});
