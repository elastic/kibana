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
import { registerListProposedSkillsRoute } from './list_proposed_skills';

describe('GET /internal/aesop/skills/proposed', () => {
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

    registerListProposedSkillsRoute({ router: mockRouter, logger: mockLogger });
  });

  describe('route registration', () => {
    it('should register GET route for /internal/aesop/skills/proposed', () => {
      expect(mockRouter.versioned.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/aesop/skills/proposed',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['evals'],
            },
          },
        })
      );
    });
  });

  describe('successful retrieval', () => {
    it('should return skills from ES with id mapped from _id', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'skill-abc',
              _source: {
                name: 'Lateral Movement Investigation',
                description: 'Investigates lateral movement alerts',
                confidence: 0.92,
                derived_from: 'patterns',
                validation: { status: 'passed' },
                metadata: { created_at: '2026-03-24T10:00:00.000Z' },
              },
            },
            {
              _id: 'skill-def',
              _source: {
                name: 'Credential Access Timeline',
                description: 'Builds credential access timeline',
                confidence: 0.88,
                derived_from: 'relationships',
                validation: { status: 'pending' },
                metadata: { created_at: '2026-03-24T11:00:00.000Z' },
              },
            },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          skills: [
            expect.objectContaining({
              id: 'skill-abc',
              name: 'Lateral Movement Investigation',
            }),
            expect.objectContaining({
              id: 'skill-def',
              name: 'Credential Access Timeline',
            }),
          ],
          total: 2,
          limit: 20,
          offset: 0,
        },
      });
    });

    it('should handle hits.total as a number', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: 42,
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.total).toBe(42);
    });

    it('should handle hits.total as an object with value', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 99, relation: 'eq' },
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.total).toBe(99);
    });

    it('should default total to 0 when hits.total is undefined', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: undefined,
        },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.total).toBe(0);
    });
  });

  describe('filtering', () => {
    it('should use match_all when status is "all" and derived_from is "all"', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ match_all: {} }],
            },
          },
        })
      );
    });

    it('should filter by validation.status when status is "passed"', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'passed', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ term: { 'validation.status': 'passed' } }],
            },
          },
        })
      );
    });

    it('should filter by validation.status when status is "failed"', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'failed', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ term: { 'validation.status': 'failed' } }],
            },
          },
        })
      );
    });

    it('should filter by review.status when status is "pending_review"', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'pending_review', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ term: { 'review.status': 'pending_review' } }],
            },
          },
        })
      );
    });

    it('should filter by derived_from when not "all"', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'patterns', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [{ term: { derived_from: 'patterns' } }],
            },
          },
        })
      );
    });

    it('should combine status and derived_from filters', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'passed', derived_from: 'relationships', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: expect.arrayContaining([
                { term: { derived_from: 'relationships' } },
                { term: { 'validation.status': 'passed' } },
              ]),
            },
          },
        })
      );
    });
  });

  describe('pagination', () => {
    it('should pass limit and offset to ES search', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 10, offset: 30 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 30,
          size: 10,
        })
      );
    });

    it('should return limit and offset in the response', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 50, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 5, offset: 10 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      const responseBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(responseBody.limit).toBe(5);
      expect(responseBody.offset).toBe(10);
      expect(responseBody.total).toBe(50);
    });
  });

  describe('sorting', () => {
    it('should sort by created_at desc then confidence desc', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ 'metadata.created_at': { order: 'desc' } }, { confidence: { order: 'desc' } }],
        })
      );
    });
  });

  describe('index not found', () => {
    it('should return empty list when index does not exist', async () => {
      const indexNotFoundError = new Error('index_not_found_exception') as any;
      indexNotFoundError.meta = {
        body: {
          error: {
            type: 'index_not_found_exception',
            reason: 'no such index [.aesop-proposed-skills]',
          },
        },
      };
      mockEsClient.search.mockRejectedValue(indexNotFoundError);

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          skills: [],
          total: 0,
          limit: 20,
          offset: 0,
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('not found - returning empty list')
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
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to list proposed skills'),
        },
      });
      // Implementation logs as a template string, not structured log
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Failed to list proposed skills')
      );
    });

    it('should return 500 when ES client throws an unexpected error', async () => {
      mockEsClient.search.mockRejectedValue(new Error('Connection refused'));

      const mockContext = createMockContext();
      const mockRequest = httpServerMock.createKibanaRequest({
        query: { status: 'all', derived_from: 'all', limit: 20, offset: 0 },
      });

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to list proposed skills'),
        },
      });
    });
  });
});
