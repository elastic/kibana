/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { OsqueryQueries } from '../../../common/search_strategy';

/**
 * Creates a mock Osquery application context for testing.
 */
export const createMockOsqueryContext = () => {
  const logger = loggingSystemMock.createLogger();
  const mockSavedObjectsClient = {
    find: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCoreStart = {
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue(mockSavedObjectsClient),
      createInternalRepository: jest.fn(),
    },
    http: {
      basePath: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(''),
      },
    },
  };

  return {
    logFactory: {
      get: jest.fn().mockReturnValue(logger),
    },
    service: {
      getIntegrationNamespaces: jest.fn().mockResolvedValue({}),
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default' }),
    },
    getStartServices: jest.fn().mockResolvedValue([mockCoreStart, {}, {}]),
  };
};

/**
 * Creates a properly mocked router using httpServiceMock.
 */
export const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

interface MockResultsOptions {
  total?: number;
  edges?: unknown[];
  pitId?: string;
  searchAfter?: unknown;
  hasMore?: boolean;
}

/**
 * Factory to create mock results response.
 */
export const createMockResultsResponse = (options: MockResultsOptions = {}) => {
  const { total = 100, edges = [], pitId, searchAfter, hasMore = false } = options;

  return {
    total,
    edges,
    rawResponse: { hits: { hits: edges } },
    inspect: { dsl: [] },
    isPartial: false,
    isRunning: false,
    loaded: edges.length,
    pitId,
    searchAfter,
    hasMore,
  };
};

/**
 * Factory to create mock action details response.
 */
export const createMockActionDetailsResponse = (
  queries = [{ action_id: 'action-123', agents: ['agent-1'] }]
) => ({
  actionDetails: {
    _id: 'action-id',
    _index: '.fleet-actions',
    _source: {
      queries,
    },
  },
});

interface MockLiveQueryResultsRequestParams {
  id: string;
  actionId: string;
  query?: Record<string, unknown>;
}

/**
 * Factory to create mock HTTP request for live query results route.
 */
export const createMockLiveQueryResultsRequest = (params: MockLiveQueryResultsRequestParams) =>
  httpServerMock.createKibanaRequest({
    params: { id: params.id, actionId: params.actionId },
    query: params.query || {},
  });

/**
 * Creates a mock Elasticsearch client with PIT support.
 */
export const createMockEsClientWithPit = () => {
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
  mockEsClient.openPointInTime.mockResolvedValue({
    id: 'mock-pit-id',
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  });
  mockEsClient.closePointInTime.mockResolvedValue({ succeeded: true, num_freed: 1 });

  return mockEsClient;
};

/**
 * Factory to create mock action results response (for getActionResponses).
 */
export const createMockActionResultsResponse = () => ({
  edges: [],
  total: 0,
  rawResponse: {
    aggregations: {
      aggs: {
        responses_by_action_id: {
          doc_count: 0,
          rows_count: { value: 0 },
          responses: { buckets: [] },
        },
      },
    },
  },
  inspect: { dsl: [] },
});

interface MockSearchStrategyOptions {
  actionDetailsResponse?: ReturnType<typeof createMockActionDetailsResponse>;
  actionResultsResponse?: ReturnType<typeof createMockActionResultsResponse>;
  resultsResponse?: ReturnType<typeof createMockResultsResponse>;
}

/**
 * Helper to create mock search strategy for live query results.
 */
export const createMockLiveQuerySearchStrategy = (options: MockSearchStrategyOptions = {}) =>
  jest.fn((request: { factoryQueryType: string }) => {
    if (request.factoryQueryType === OsqueryQueries.actionDetails) {
      return of(options.actionDetailsResponse || createMockActionDetailsResponse());
    }

    if (request.factoryQueryType === OsqueryQueries.actionResults) {
      return of(options.actionResultsResponse || createMockActionResultsResponse());
    }

    if (request.factoryQueryType === OsqueryQueries.results) {
      return of(options.resultsResponse || createMockResultsResponse());
    }

    throw new Error(`Unexpected query type: ${request.factoryQueryType}`);
  });

/**
 * Helper to create mock context with ES client and search capabilities.
 */
export const createMockContextWithEsClient = (
  mockSearchFn: jest.Mock,
  mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>
) => {
  const mockCoreContext = coreMock.createRequestHandlerContext();
  mockCoreContext.savedObjects.client.getCurrentNamespace = jest.fn().mockReturnValue('default');

  // Replace the ES client with our mock
  mockCoreContext.elasticsearch.client.asCurrentUser = mockEsClient;

  const mockContext = {
    core: Promise.resolve(mockCoreContext),
    search: Promise.resolve({
      search: mockSearchFn,
      saveSession: jest.fn(),
      getSession: jest.fn(),
      findSessions: jest.fn(),
      updateSession: jest.fn(),
      cancelSession: jest.fn(),
      deleteSession: jest.fn(),
      extendSession: jest.fn(),
      getSessionStatus: jest.fn(),
    }),
  };

  return mockContext;
};

interface MockEsSearchResponseOptions {
  hits?: unknown[];
  total?: { value: number; relation: 'eq' | 'gte' };
  pit_id?: string;
}

/**
 * Helper to generate mock ES search response for PIT pagination.
 */
export const createMockEsSearchResponse = (options: MockEsSearchResponseOptions = {}) => {
  const { hits = [], total = { value: 0, relation: 'eq' as const }, pit_id } = options;

  return {
    took: 10,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      hits,
      total,
    },
    ...(pit_id ? { pit_id } : {}),
  };
};
