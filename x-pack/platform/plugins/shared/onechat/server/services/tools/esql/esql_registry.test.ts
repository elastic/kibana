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
import { EsqlToolCreateRequest, EsqlToolCreateResponse } from '../../../../common/tools';
import { createClient, EsqlToolClient } from './client';
import { EsqlToolStorage } from './storage';

describe('EsqlToolRegistry', () => {
  let registry: EsqlToolRegistry;
  let mockRequest: KibanaRequest;
  let mockElasticsearchClient: any;
  let elasticsearch: ElasticsearchServiceStart;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = httpServerMock.createKibanaRequest();
    mockElasticsearchClient = {
      get: jest.fn(),
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn(),
    };

    elasticsearch = {
      client: {
        asScoped: jest.fn().mockReturnValue({
          asInternalUser: mockElasticsearchClient,
        }),
        asInternalUser: mockElasticsearchClient,
        asCurrentUser: mockElasticsearchClient,
      },
    } as unknown as ElasticsearchServiceStart;

    registry = createEsqlToolRegistry(logger, elasticsearch);
  });

  describe('has', () => {
    it('should return true when tool exists', async () => {
      const mockTool: EsqlToolCreateResponse = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [{ _source: mockTool }],
        },
      });

      const exists = await registry.has({ toolId: '123', request: mockRequest });

      expect(exists).toBe(true);
    });
  });

  describe('get', () => {
    it('should return a tool when it exists', async () => {
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: {
          providerId: 'esql',
          tags: ['salesforce'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [{ _source: mockTool }],
        },
      });

      const result = await registry.get({ toolId: '123', request: mockRequest });

      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          description: 'A test tool',
          meta: expect.objectContaining({
            providerId: 'esql',
            tags: expect.arrayContaining(['salesforce']),
          }),
        })
      );

      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('handler');
    });

    it('should throw error when tool does not exist', async () => {
      mockElasticsearchClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 0 },
          hits: [],
        },
      });
      mockElasticsearchClient.get.mockRejectedValueOnce(
        new Error('ResponseError: resource_not_found_exception')
      );

      await expect(
        registry.get({ toolId: 'non-existent-tool', request: mockRequest })
      ).rejects.toThrow('Tool with id non-existent-tool not found');
    });
  });

  describe('list', () => {
    it('should return all registered tools', async () => {
      const mockTools: EsqlToolCreateResponse[] = [
        {
          id: '123',
          name: 'test-tool-1',
          description: 'A test tool',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
          params: { case_id: { type: 'keyword', description: 'Case ID' } },
          meta: {
            providerId: 'esql',
            tags: ['salesforce'],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '456',
          name: 'test-tool-2',
          description: 'A test tool',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
          params: { case_id: { type: 'keyword', description: 'Case ID' } },
          meta: {
            providerId: 'esql',
            tags: ['salesforce'],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockElasticsearchClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: mockTools.map((tool) => ({ _source: tool })),
        },
      });

      const tools = await registry.list({ request: mockRequest });

      expect(tools).toHaveLength(2);
    });

    it('should return empty array when no tools are registered', async () => {
      mockElasticsearchClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [],
        },
      });

      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([]);
    });
  });

  describe('getScopedClient', () => {
    it('should return a scoped client', async () => {
      const client = await registry.getScopedClient({ request: mockRequest });

      expect(client).toBeDefined();
      expect(typeof client.get).toBe('function');
      expect(typeof client.list).toBe('function');
      expect(typeof client.create).toBe('function');
      expect(typeof client.update).toBe('function');
      expect(typeof client.delete).toBe('function');
    });
  });
});

describe('EsqlToolClient', () => {
  let client: EsqlToolClient;
  let mockStorage: jest.Mocked<EsqlToolStorage>;
  let mockElasticsearchClient: any;

  beforeEach(() => {
    mockElasticsearchClient = {
      get: jest.fn(),
      search: jest.fn(),
      index: jest.fn(),
      delete: jest.fn(),
    };

    mockStorage = {
      getClient: jest.fn().mockReturnValue(mockElasticsearchClient),
      createIndex: jest.fn(),
      indexExists: jest.fn(),
    } as unknown as jest.Mocked<EsqlToolStorage>;

    client = createClient({ storage: mockStorage });
  });

  describe('create', () => {
    it('should create a tool successfully', async () => {
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: {
          providerId: 'esql',
          tags: ['test'],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      });

      mockElasticsearchClient.index.mockResolvedValue({ _id: '123' });

      const result = await client.create(mockTool);

      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          name: 'test-tool',
          meta: {
            providerId: 'esql',
            tags: ['test'],
          },
        })
      );
    });

    it('should throw error when tool name already exists', async () => {
      const mockTool: EsqlToolCreateRequest = {
        id: '123',
        name: 'existing-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: {
          providerId: 'esql',
          tags: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: '123',
              },
            },
          ],
        },
      });

      await expect(client.create(mockTool)).rejects.toThrow('Tool with id 123 already exists');
    });
  });

  describe('get', () => {
    it('should retrieve a tool by id', async () => {
      const mockTool: EsqlToolCreateResponse = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: {
          providerId: 'esql',
          tags: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.get.mockResolvedValue({
        _source: mockTool,
      });

      const result = await client.get('123');

      expect(result).toEqual(mockTool);
      expect(mockElasticsearchClient.get).toHaveBeenCalledWith({ id: '123' });
    });

    it('should throw error when tool is not found', async () => {
      mockElasticsearchClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.get('non-existent')).rejects.toThrow(
        'Tool with id non-existent not found'
      );
    });
  });

  describe('list', () => {
    it('should list all tools', async () => {
      const mockTools: EsqlToolCreateResponse[] = [
        {
          id: '123',
          name: 'tool-1',
          description: 'Tool 1',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
          params: { case_id: { type: 'keyword', description: 'Case ID' } },
          meta: { providerId: 'esql', tags: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '456',
          name: 'tool-2',
          description: 'Tool 2',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
          params: { case_id: { type: 'keyword', description: 'Case ID' } },
          meta: { providerId: 'esql', tags: [] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockElasticsearchClient.search.mockResolvedValue({
        hits: {
          hits: mockTools.map((tool) => ({ _source: tool })),
        },
      });

      const result = await client.list();

      expect(result).toEqual(mockTools);
      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        index: '.kibana_onechat_esql_tools',
        query: { match_all: {} },
        size: 1000,
        track_total_hits: true,
      });
    });
  });

  describe('update', () => {
    it('should update an existing tool', async () => {
      const existingTool: EsqlToolCreateResponse = {
        id: '123',
        name: 'existing-tool',
        description: 'Original description',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: { providerId: 'esql', tags: ['original'] },
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const updates: Partial<EsqlToolCreateRequest> = {
        description: 'Updated description',
      };

      mockElasticsearchClient.get.mockResolvedValue({
        _source: existingTool,
      });

      mockElasticsearchClient.index.mockResolvedValue({ _id: '123' });

      const result = await client.update('123', updates);

      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          name: 'existing-tool',
          description: 'Updated description',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
          created_at: '2024-01-01T00:00:00.000Z',
        })
      );

      expect(mockElasticsearchClient.index).toHaveBeenCalledWith({
        id: '123',
        document: expect.objectContaining({
          description: 'Updated description',
          query: 'FROM my_cases | WHERE case_id == ?case_id',
        }),
      });
    });
  });

  describe('delete', () => {
    it('should delete a tool successfully', async () => {
      const mockTool: EsqlToolCreateResponse = {
        id: '123',
        name: 'test-tool',
        description: 'A test tool',
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'keyword', description: 'Case ID' } },
        meta: { providerId: 'esql', tags: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockElasticsearchClient.get.mockResolvedValue({
        _source: mockTool,
      });

      mockElasticsearchClient.delete.mockResolvedValue({ _id: '123' });

      const result = await client.delete('123');

      expect(result).toBe(true);
    });

    it('should throw error when trying to delete non-existent tool', async () => {
      mockElasticsearchClient.delete.mockRejectedValueOnce(
        new Error('ResponseError: resource_not_found_exception')
      );

      await expect(client.delete('non-existent')).rejects.toThrow(
        'ResponseError: resource_not_found_exception'
      );
    });
  });
});
