/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { registerGetExplorationHistoryRoute } from './get_exploration_history';

const WORKFLOW_EXECUTIONS_INDEX = '.aesop-workflow-executions';

describe('GET /internal/aesop/exploration/history', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: Function;
  let mockRouter: any;

  const createMockContext = () =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
            asInternalUser: mockEsClient,
          },
        },
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockResponse = httpServerMock.createResponseFactory();

    mockRouter = {
      versioned: {
        get: jest.fn().mockReturnValue({
          addVersion: jest.fn((_config: any, handler: Function) => {
            routeHandler = handler;
          }),
        }),
      },
    } as any;

    registerGetExplorationHistoryRoute({ router: mockRouter, logger: mockLogger });
  });

  describe('successful retrieval', () => {
    it('should return exploration history from ES', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'aesop-1711100000-abc123',
              _source: {
                workflow_name: 'aesop.self_exploration',
                status: 'completed',
                started_at: '2026-03-22T10:00:00.000Z',
                completed_at: '2026-03-22T10:15:00.000Z',
              },
            },
            {
              _id: 'aesop-1711000000-def456',
              _source: {
                workflow_name: 'aesop.self_exploration',
                status: 'failed',
                started_at: '2026-03-21T08:00:00.000Z',
                error_message: 'Timeout',
              },
            },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          explorations: [
            expect.objectContaining({
              execution_id: 'aesop-1711100000-abc123',
              workflow_name: 'aesop.self_exploration',
              status: 'completed',
            }),
            expect.objectContaining({
              execution_id: 'aesop-1711000000-def456',
              workflow_name: 'aesop.self_exploration',
              status: 'failed',
            }),
          ],
        },
      });
    });

    it('should map _id to execution_id in the response', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'my-custom-exec-id',
              _source: { status: 'running' },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.explorations[0].execution_id).toBe('my-custom-exec-id');
    });

    it('should search with default limit of 20 and sort by started_at desc', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: WORKFLOW_EXECUTIONS_INDEX,
          size: 20,
          sort: [{ started_at: { order: 'desc' } }],
          query: { match_all: {} },
        })
      );
    });
  });

  describe('limit parameter', () => {
    it('should respect the limit query parameter', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: { limit: '5' } });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 5,
        })
      );
    });

    it('should clamp limit to a maximum of 100', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: { limit: '500' } });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 100,
        })
      );
    });

    it('should clamp limit to a minimum of 1', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      // Number('0') || 20 = 20 (0 is falsy), then Math.max(20, 1) = 20
      const mockRequest = httpServerMock.createKibanaRequest({ query: { limit: '0' } });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 20,
        })
      );
    });

    it('should default to 20 when limit is not a valid number', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: { limit: 'abc' } });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 20,
        })
      );
    });
  });

  describe('index not found', () => {
    it('should return empty array when the index does not exist', async () => {
      const indexNotFoundError = new Error('index_not_found_exception') as any;
      indexNotFoundError.meta = {
        body: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index [.aesop-workflow-executions]',
          },
        },
      };
      mockEsClient.search.mockRejectedValue(indexNotFoundError);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { explorations: [] },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not found - returning empty history')
      );
    });
  });

  describe('error handling', () => {
    it('should return 500 on non-index-not-found ES errors', async () => {
      const esError = new Error('Circuit breaking exception') as any;
      esError.meta = {
        body: {
          error: {
            type: 'circuit_breaking_exception',
            reason: 'Data too large',
          },
        },
      };
      mockEsClient.search.mockRejectedValue(esError);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to fetch exploration history'),
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[AESOP] Failed to fetch exploration history',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should return 500 when context resolution fails', async () => {
      const mockContext = {
        core: Promise.reject(new Error('Context provider failed')),
      } as any;
      const mockRequest = httpServerMock.createKibanaRequest({ query: {} });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to fetch exploration history'),
        },
      });
    });
  });

  describe('route registration', () => {
    it('should register GET route for /internal/aesop/exploration/history', () => {
      expect(mockRouter.versioned.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/aesop/exploration/history',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['evals'],
            },
          },
          options: {
            tags: ['access:evals'],
          },
        })
      );
    });

    it('should use validate: false in addVersion', () => {
      // Access the addVersion mock from the object returned by the first get() call
      const versionedRoute = mockRouter.versioned.get.mock.results[0].value;
      const [config] = versionedRoute.addVersion.mock.calls[0];

      expect(config.validate).toBe(false);
      expect(config.version).toBe('1');
    });
  });
});
