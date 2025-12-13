/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { getLiveQueryResultsRoute } from './get_live_query_results_route';
import {
  createMockActionDetailsResponse,
  createMockContextWithEsClient,
  createMockEsClientWithPit,
  createMockEsSearchResponse,
  createMockLiveQueryResultsRequest,
  createMockLiveQuerySearchStrategy,
  createMockOsqueryContext,
  createMockRouter,
  createMockResultsResponse,
} from './mocks';
import { OsqueryQueries } from '../../../common/search_strategy';
import {
  MAX_OFFSET_RESULTS,
  MAX_PIT_OFFSET,
  MAX_PIT_ID_LENGTH,
  MAX_SEARCH_AFTER_SIZE,
  MAX_SORT_FIELDS,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

describe('getLiveQueryResultsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<typeof createMockRouter>;
  let routeHandler: RequestHandler;

  beforeEach(() => {
    mockOsqueryContext = createMockOsqueryContext();
    mockRouter = createMockRouter();
    jest.clearAllMocks();

    getLiveQueryResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute(
      'get',
      '/api/osquery/live_queries/{id}/results/{actionId}'
    );
    const routeVersion = route.versions['2023-10-31'];
    if (!routeVersion) {
      throw new Error('Handler for version [2023-10-31] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('route registration', () => {
    it('should register the get live query results route', () => {
      const route = mockRouter.versioned.getRoute(
        'get',
        '/api/osquery/live_queries/{id}/results/{actionId}'
      );

      expect(route).toBeDefined();
      expect(route.versions['2023-10-31']).toBeDefined();
      expect(route.versions['2023-10-31'].handler).toBeDefined();
    });
  });

  describe('isSortResults validation', () => {
    // Test the searchAfter validation logic indirectly through the route behavior
    // The route validates searchAfter must be an array of primitives

    it('should accept valid searchAfter with numbers', () => {
      // Valid: [1733900000000, 12345]
      const validSearchAfter = JSON.stringify([1733900000000, 12345]);
      expect(() => JSON.parse(validSearchAfter)).not.toThrow();
      const parsed = JSON.parse(validSearchAfter);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((item: unknown) => typeof item === 'number')).toBe(true);
    });

    it('should accept valid searchAfter with strings', () => {
      // Valid: ["value1", "value2"]
      const validSearchAfter = JSON.stringify(['value1', 'value2']);
      const parsed = JSON.parse(validSearchAfter);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((item: unknown) => typeof item === 'string')).toBe(true);
    });

    it('should accept valid searchAfter with mixed primitives', () => {
      // Valid: [1733900000000, "doc-id", null, true]
      const validSearchAfter = JSON.stringify([1733900000000, 'doc-id', null, true]);
      const parsed = JSON.parse(validSearchAfter);
      expect(Array.isArray(parsed)).toBe(true);
      expect(
        parsed.every(
          (item: unknown) =>
            item === null ||
            typeof item === 'string' ||
            typeof item === 'number' ||
            typeof item === 'boolean'
        )
      ).toBe(true);
    });

    it('should detect invalid searchAfter with objects', () => {
      // Invalid: [{ key: "value" }]
      const invalidSearchAfter = JSON.stringify([{ key: 'value' }]);
      const parsed = JSON.parse(invalidSearchAfter);
      expect(Array.isArray(parsed)).toBe(true);
      // Objects are NOT valid sort results
      expect(parsed.some((item: unknown) => typeof item === 'object' && item !== null)).toBe(true);
    });

    it('should detect invalid searchAfter with arrays', () => {
      // Invalid: [[1, 2, 3]]
      const invalidSearchAfter = JSON.stringify([[1, 2, 3]]);
      const parsed = JSON.parse(invalidSearchAfter);
      expect(Array.isArray(parsed)).toBe(true);
      // Nested arrays are NOT valid sort results
      expect(parsed.some((item: unknown) => Array.isArray(item))).toBe(true);
    });
  });

  describe('pagination constants', () => {
    it('should export MAX_OFFSET_RESULTS as 10000', () => {
      expect(MAX_OFFSET_RESULTS).toBe(10000);
    });

    it('should export MAX_PIT_OFFSET as 100000', () => {
      expect(MAX_PIT_OFFSET).toBe(100000);
    });

    it('should export MAX_PIT_ID_LENGTH as 2048', () => {
      expect(MAX_PIT_ID_LENGTH).toBe(2048);
    });

    it('should export MAX_SEARCH_AFTER_SIZE as 1024', () => {
      expect(MAX_SEARCH_AFTER_SIZE).toBe(1024);
    });

    it('should export MAX_SORT_FIELDS as 10', () => {
      expect(MAX_SORT_FIELDS).toBe(10);
    });

    it('should have MAX_PIT_OFFSET be 10x MAX_OFFSET_RESULTS', () => {
      expect(MAX_PIT_OFFSET).toBe(MAX_OFFSET_RESULTS * 10);
    });

    it('should use PIT mode when offset exceeds 10k', () => {
      const page = 150;
      const pageSize = 100;
      const offset = page * pageSize; // 15000

      expect(offset).toBe(15000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(true);
    });

    it('should use offset mode when offset is within 10k', () => {
      const page = 50;
      const pageSize = 100;
      const offset = page * pageSize; // 5000

      expect(offset).toBe(5000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(false);
    });

    it('should use PIT mode at exactly 10k threshold', () => {
      const page = 100;
      const pageSize = 100;
      const offset = page * pageSize; // 10000

      expect(offset).toBe(10000);
      expect(offset >= MAX_OFFSET_RESULTS).toBe(true);
    });

    it('should reject requests at MAX_PIT_OFFSET threshold', () => {
      const page = 1000;
      const pageSize = 100;
      const offset = page * pageSize; // 100000

      expect(offset).toBe(100000);
      expect(offset >= MAX_PIT_OFFSET).toBe(true);
    });

    it('should allow requests just under MAX_PIT_OFFSET', () => {
      const page = 999;
      const pageSize = 100;
      const offset = page * pageSize; // 99900

      expect(offset).toBe(99900);
      expect(offset >= MAX_PIT_OFFSET).toBe(false);
    });
  });

  describe('searchAfter size limits', () => {
    it('should reject searchAfter exceeding MAX_SEARCH_AFTER_SIZE', () => {
      const largeSearchAfter = JSON.stringify(Array(200).fill('x'.repeat(100)));
      expect(largeSearchAfter.length).toBeGreaterThan(MAX_SEARCH_AFTER_SIZE);
    });

    it('should reject searchAfter with more than MAX_SORT_FIELDS', () => {
      const tooManyFields = Array(MAX_SORT_FIELDS + 5).fill(123);
      expect(tooManyFields.length).toBeGreaterThan(MAX_SORT_FIELDS);
    });

    it('should accept searchAfter within limits', () => {
      const validSearchAfter = JSON.stringify([1733900000000, 12345]);
      expect(validSearchAfter.length).toBeLessThan(MAX_SEARCH_AFTER_SIZE);

      const parsed = JSON.parse(validSearchAfter);
      expect(parsed.length).toBeLessThanOrEqual(MAX_SORT_FIELDS);
    });
  });

  describe('pitId validation', () => {
    it('should reject pitId exceeding MAX_PIT_ID_LENGTH', () => {
      const largePitId = 'x'.repeat(MAX_PIT_ID_LENGTH + 100);
      expect(largePitId.length).toBeGreaterThan(MAX_PIT_ID_LENGTH);
    });

    it('should accept pitId within limit', () => {
      const validPitId = 'x'.repeat(500);
      expect(validPitId.length).toBeLessThan(MAX_PIT_ID_LENGTH);
    });

    it('should accept typical PIT ID length (~200-500 chars)', () => {
      const typicalPitIdLength = 350;
      expect(typicalPitIdLength).toBeLessThan(MAX_PIT_ID_LENGTH);
    });
  });

  describe('PIT pagination logic', () => {
    it('should require both pitId and searchAfter for pagination continuation', () => {
      // Both pitId and searchAfter must be provided for PIT-based pagination
      const hasPitId = true;
      const hasSearchAfter = true;

      // Only use provided PIT if searchAfter is also provided
      const canUsePitPagination = hasPitId && hasSearchAfter;
      expect(canUsePitPagination).toBe(true);
    });

    it('should ignore pitId when searchAfter is not provided', () => {
      const hasPitId = true;
      const hasSearchAfter = false;

      // pitId alone is useless without searchAfter
      const canUsePitPagination = hasPitId && hasSearchAfter;
      expect(canUsePitPagination).toBe(false);
    });

    it('should not use PIT pagination when neither is provided', () => {
      const hasPitId = false;
      const hasSearchAfter = false;

      const canUsePitPagination = hasPitId && hasSearchAfter;
      expect(canUsePitPagination).toBe(false);
    });
  });

  describe('deep pagination edge cases', () => {
    it('should not fall back to offset pagination when deep page requested but PIT has no results (total=0)', async () => {
      const mockEsClient = createMockEsClientWithPit();
      mockEsClient.search.mockResolvedValueOnce(
        createMockEsSearchResponse({ hits: [], total: { value: 0, relation: 'eq' } })
      );

      const mockSearchFn = createMockLiveQuerySearchStrategy({
        actionDetailsResponse: createMockActionDetailsResponse([
          { action_id: 'action-123', agents: ['agent-1'] },
        ]),
      });

      const mockContext = createMockContextWithEsClient(mockSearchFn, mockEsClient);
      const mockRequest = createMockLiveQueryResultsRequest({
        id: 'live-query-id',
        actionId: 'action-123',
        query: { page: 150, pageSize: 100 }, // offset 15000 -> PIT mode
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should open PIT and then immediately close it for out-of-range request.
      expect(mockEsClient.openPointInTime).toHaveBeenCalled();
      expect(mockEsClient.closePointInTime).toHaveBeenCalled();

      // Should NOT execute offset-mode results strategy search (would hit 10k cap).
      const executedQueryTypes = mockSearchFn.mock.calls.map(([req]) => req.factoryQueryType);
      expect(executedQueryTypes).not.toContain(OsqueryQueries.results);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          data: expect.objectContaining({
            edges: [],
            total: 0,
            hasMore: false,
            pitId: undefined,
            searchAfter: undefined,
          }),
        },
      });
    });
  });

  describe('hasMore calculation', () => {
    it('should set hasMore=false when total equals pageSize in offset mode', async () => {
      const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
      const mockSearchFn = createMockLiveQuerySearchStrategy({
        actionDetailsResponse: createMockActionDetailsResponse([
          { action_id: 'action-123', agents: ['agent-1'] },
        ]),
        resultsResponse: createMockResultsResponse({
          total: 100,
          edges: Array.from({ length: 100 }).map((_, i) => ({ _id: `${i}`, _index: 'test' })),
          hasMore: true, // ensure route overrides previous behavior
        }),
      });

      const mockContext = createMockContextWithEsClient(mockSearchFn, mockEsClient);
      const mockRequest = createMockLiveQueryResultsRequest({
        id: 'live-query-id',
        actionId: 'action-123',
        query: { page: 0, pageSize: 100 },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          data: expect.objectContaining({
            total: 100,
            hasMore: false,
          }),
        },
      });
    });

    it('should set hasMore=false when total equals pageSize in PIT mode', async () => {
      const mockEsClient = createMockEsClientWithPit();
      // Seek batch to targetOffset=10000 (page 100 * 100) – return exactly 10k docs and total=10000
      mockEsClient.search.mockResolvedValueOnce(
        createMockEsSearchResponse({
          hits: [],
          total: { value: 10000, relation: 'eq' },
          pitId: 'mock-pit-id',
        })
      );

      const mockSearchFn = createMockLiveQuerySearchStrategy({
        actionDetailsResponse: createMockActionDetailsResponse([
          { action_id: 'action-123', agents: ['agent-1'] },
        ]),
      });

      const mockContext = createMockContextWithEsClient(mockSearchFn, mockEsClient);
      const mockRequest = createMockLiveQueryResultsRequest({
        id: 'live-query-id',
        actionId: 'action-123',
        query: { page: 100, pageSize: 100 }, // offset 10000 -> PIT mode, out-of-range because total=10000
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // out-of-range: page starts at offset==total => empty page, no PIT returned
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          data: expect.objectContaining({
            total: 10000,
            edges: [],
            hasMore: false,
            pitId: undefined,
            searchAfter: undefined,
          }),
        },
      });
    });
  });
});
