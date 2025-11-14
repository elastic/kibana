/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OsqueryQueries } from '../../../common/search_strategy';
import type { ActionResultsStrategyResponse, Direction } from '../../../common/search_strategy';

/**
 * Creates a mock Osquery application context for testing.
 * Includes mocked logger, saved objects client, and core services.
 */
export const createMockOsqueryContext = (): OsqueryAppContext => {
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
  } as unknown as OsqueryAppContext;
};

/**
 * Creates a properly mocked router using httpServiceMock.
 * This properly mocks the versioned route chain.
 */
export const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

/**
 * Factory to create mock action results response.
 *
 * @param edges - Number of result edges to generate OR array of specific agent IDs
 * @param aggregations - Optional aggregation values for the response
 * @returns Mocked ActionResultsStrategyResponse
 */
export const createMockActionResultsResponse = (
  edges: number | string[] = 10,
  aggregations?: {
    totalResponded?: number;
    totalRowCount?: number;
    successCount?: number;
    errorCount?: number;
  }
): ActionResultsStrategyResponse => {
  const {
    totalResponded = 10,
    totalRowCount = 100,
    successCount = 8,
    errorCount = 2,
  } = aggregations || {};

  // Support both number of edges and specific agent IDs
  const edgeArray = Array.isArray(edges)
    ? edges.map((agentId, i) => ({
        _id: `result-${i}`,
        _index: '.logs-osquery_manager.action.responses',
        _source: {},
        fields: { agent_id: [agentId] },
      }))
    : Array(edges)
        .fill(null)
        .map((_, i) => ({
          _id: `result-${i}`,
          _index: '.logs-osquery_manager.action.responses',
          _source: {},
          fields: { agent_id: [`agent-${i}`] },
        }));

  const edgeCount = Array.isArray(edges) ? edges.length : edges;

  return {
    edges: edgeArray,
    total: edgeCount,
    rawResponse: {
      aggregations: {
        aggs: {
          responses_by_action_id: {
            doc_count: totalResponded,
            rows_count: { value: totalRowCount },
            responses: {
              buckets: [
                { key: 'success', doc_count: successCount },
                { key: 'error', doc_count: errorCount },
              ],
            },
          },
        },
      },
    },
    inspect: { dsl: [] },
  } as unknown as ActionResultsStrategyResponse;
};

/**
 * Factory to create mock HTTP request for testing.
 *
 * @param params - Request parameters including actionId and optional query params
 * @returns Mocked Kibana request object
 */
export const createMockRequest = (params: {
  actionId: string;
  query?: {
    agentIds?: string;
    kuery?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    sortOrder?: Direction;
    startDate?: string;
  };
}) =>
  httpServerMock.createKibanaRequest({
    params: { actionId: params.actionId },
    query: params.query || {},
  });

/**
 * Helper to create mock search strategy that responds to action results queries.
 *
 * @param actionResultsResponse - Optional response for action results queries
 * @returns Jest mock function that returns appropriate responses based on query type
 */
export const createMockSearchStrategy = (actionResultsResponse?: ActionResultsStrategyResponse) =>
  jest.fn(
    (
      request: { factoryQueryType: string; [key: string]: unknown },
      options: { abortSignal?: AbortSignal; strategy: string }
    ) => {
      if (request.factoryQueryType === OsqueryQueries.actionResults) {
        return of(actionResultsResponse || createMockActionResultsResponse());
      }

      throw new Error(`Unexpected query type: ${request.factoryQueryType}`);
    }
  );

/**
 * Helper to create mock context with properly structured core and search.
 * Provides a complete DataRequestHandlerContext mock with search capabilities.
 *
 * @param mockSearchFn - Jest mock function for search strategy
 * @returns Mocked DataRequestHandlerContext
 */
export const createMockContext = (mockSearchFn: jest.Mock) => {
  const mockCoreContext = coreMock.createRequestHandlerContext();
  mockCoreContext.savedObjects.client.getCurrentNamespace = jest.fn().mockReturnValue('default');

  // Properly typed context that matches DataRequestHandlerContext structure
  const mockContext = {
    core: Promise.resolve(mockCoreContext),
    search: Promise.resolve({
      search: mockSearchFn,
      // These are required by IScopedSearchClient but won't be called in our tests
      saveSession: jest.fn(),
      getSession: jest.fn(),
      findSessions: jest.fn(),
      updateSession: jest.fn(),
      cancelSession: jest.fn(),
      deleteSession: jest.fn(),
      extendSession: jest.fn(),
      getSessionStatus: jest.fn(),
    } as unknown as IScopedSearchClient),
  } as unknown as DataRequestHandlerContext;

  return mockContext;
};
