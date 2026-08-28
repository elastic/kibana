/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Regression repro for the "200k+ agents responded" report.
 *
 * Reported by Elastic InfoSec: a scheduled pack execution rendered
 * "203,392 agents have responded" against a fleet of ~2,500 agents. Confirmed
 * against production data: 226,140 response documents in a single execution
 * bucket, but only 399 distinct agents (top single agent contributed 2,765
 * documents).
 *
 * Root cause: the scheduled execution details endpoint counts response
 * DOCUMENTS and surfaces them as an AGENT count. The aggregation
 * (`query.scheduled_action_results.dsl.ts`) buckets docs with a painless
 * terms-script and has no `cardinality(agent_id)` anywhere, so
 * `successful` / `failed` / `totalResponded` are all doc counts.
 * `use_scheduled_execution_details.ts` then maps `agentCount: totalResponded`.
 *
 * These tests are written against the INTENDED behaviour, so they FAIL on the
 * unfixed code and PASS once the DSL grows cardinality sub-aggregations and
 * the route reads them. Each `it` states the observed-vs-expected numbers.
 *
 * The fix must keep `total` (used for status-table pagination) doc-based —
 * that grid renders one row per response document, not per agent. See the
 * "must not regress" block at the bottom.
 */

import { of } from 'rxjs';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { DataRequestHandlerContext, IScopedSearchClient } from '@kbn/data-plugin/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getScheduledActionResultsRoute } from './get_scheduled_action_results_route';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

const ROUTE_PATH = '/api/osquery/scheduled_results/{scheduleId}/{executionCount}';

/**
 * Shapes an ES response the way the FIXED aggregation is expected to return it:
 * doc counts alongside `agents.value` cardinality for each outcome.
 *
 * The unfixed route ignores the `agents` sub-aggregations entirely and reads
 * `doc_count`, which is exactly what these tests assert against.
 */
const createMockScheduledResponse = ({
  totalDocs,
  successDocs,
  errorDocs,
  successAgents,
  errorAgents,
  respondedAgents,
  rowsCount = 0,
}: {
  totalDocs: number;
  successDocs: number;
  errorDocs: number;
  successAgents: number;
  errorAgents: number;
  respondedAgents: number;
  rowsCount?: number;
}) => ({
  edges: [],
  rawResponse: {
    hits: {
      total: { value: totalDocs, relation: 'eq' },
      hits: [
        {
          fields: {
            '@timestamp': ['2026-08-24T10:00:00.000Z'],
            pack_id: ['pack-1'],
          },
        },
      ],
    },
    aggregations: {
      aggs: {
        responses_by_schedule: {
          rows_count: { value: rowsCount },
          // Present shape (doc counts) — what the unfixed route consumes.
          responses: {
            buckets: [
              { key: 'success', doc_count: successDocs },
              { key: 'error', doc_count: errorDocs },
            ],
          },
          // Expected shape after the fix: true agent cardinality.
          responded_agents: { value: respondedAgents },
          success_agents: { agents: { value: successAgents } },
          error_agents: { agents: { value: errorAgents } },
        },
      },
    },
  },
  inspect: { dsl: [] },
});

const createMockContext = (mockSearchFn: jest.Mock) => {
  const mockCoreContext = coreMock.createRequestHandlerContext();
  Object.assign(mockCoreContext.savedObjects.client, {
    get: jest.fn().mockResolvedValue({
      attributes: {
        name: 'shadow-ai-discovery-windows',
        queries: [{ schedule_id: 'sched-1', name: 'ai_docker_containers', query: 'SELECT 1;' }],
      },
    }),
  });

  return {
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
    } as unknown as IScopedSearchClient),
  } as unknown as DataRequestHandlerContext;
};

describe('scheduled execution details — agent count regression (InfoSec 200k report)', () => {
  let routeHandler: RequestHandler;

  const registerRoute = () => {
    const httpService = httpServiceMock.createSetupContract();
    const mockRouter = httpService.createRouter();
    const mockOsqueryContext = {
      isCpsActive: jest.fn().mockResolvedValue(false),
      service: { getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }) },
    } as unknown as OsqueryAppContext;

    getScheduledActionResultsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  /** Runs the route and returns the response body it produced. */
  const callRoute = async (mockSearchFn: jest.Mock) => {
    registerRoute();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { scheduleId: 'sched-1', executionCount: 0 },
      query: {},
    });
    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler(createMockContext(mockSearchFn) as any, mockRequest, mockResponse);

    const call = mockResponse.ok.mock.calls[0];
    if (!call) {
      throw new Error('Route did not respond with ok()');
    }

    return call[0]?.body as {
      total: number;
      totalPages: number;
      aggregations: {
        totalRowCount: number;
        totalResponded: number;
        successful: number;
        failed: number;
        pending: number;
      };
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('production-scale reproduction', () => {
    it('should report 399 agents, not 226140 documents, for the reported execution bucket', async () => {
      // Exact production numbers from the affected cluster:
      // 226,140 docs in execution bucket 0, 399 distinct agents.
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 226140,
            successDocs: 226140,
            errorDocs: 0,
            successAgents: 399,
            errorAgents: 0,
            respondedAgents: 399,
            rowsCount: 0,
          })
        )
      );

      const { aggregations } = await callRoute(mockSearchFn);

      // Unfixed: 226140 (doc count). This is the number the UI renders as
      // "N agents have responded" and in the green "Agents" badge.
      expect(aggregations.successful).toBe(399);
      expect(aggregations.totalResponded).toBe(399);
    });

    it('should not multiply the agent count when one agent sends many responses', async () => {
      // 2 agents, 5 response documents — the minimal shape of the same bug.
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 5,
            successDocs: 5,
            errorDocs: 0,
            successAgents: 2,
            errorAgents: 0,
            respondedAgents: 2,
          })
        )
      );

      const { aggregations } = await callRoute(mockSearchFn);

      expect(aggregations.successful).toBe(2); // unfixed: 5
      expect(aggregations.totalResponded).toBe(2); // unfixed: 5
    });
  });

  describe('success / error split', () => {
    it('should count agents per outcome rather than documents per outcome', async () => {
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 30,
            successDocs: 20,
            errorDocs: 10,
            successAgents: 3,
            errorAgents: 2,
            respondedAgents: 4, // one agent reported BOTH a success and an error
          })
        )
      );

      const { aggregations } = await callRoute(mockSearchFn);

      expect(aggregations.successful).toBe(3); // unfixed: 20
      expect(aggregations.failed).toBe(2); // unfixed: 10
    });

    it('should derive totalResponded from overall cardinality, never successful + failed', async () => {
      // Guards the subtle trap: an agent with both a success and an error doc
      // would be double-counted by a naive `successful + failed` sum.
      // Overall cardinality is 4, but 3 + 2 = 5.
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 30,
            successDocs: 20,
            errorDocs: 10,
            successAgents: 3,
            errorAgents: 2,
            respondedAgents: 4,
          })
        )
      );

      const { aggregations } = await callRoute(mockSearchFn);

      expect(aggregations.totalResponded).toBe(4);
      expect(aggregations.totalResponded).not.toBe(aggregations.successful + aggregations.failed);
    });
  });

  describe('must not regress — these values stay document-based', () => {
    it('should keep `total` as the document count so status-table pagination stays correct', async () => {
      // The status grid renders one row per response document. If `total`
      // switched to agent cardinality, pagination would truncate the grid.
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 226140,
            successDocs: 226140,
            errorDocs: 0,
            successAgents: 399,
            errorAgents: 0,
            respondedAgents: 399,
          })
        )
      );

      const body = await callRoute(mockSearchFn);

      expect(body.total).toBe(226140);
      expect(body.totalPages).toBe(Math.ceil(226140 / 20));
    });

    it('should keep totalRowCount as the sum of osquery result rows', async () => {
      // Distinct concept from agents: this is `sum(action_response.osquery.count)`.
      // The InfoSec packs legitimately return 0 rows on Windows endpoints.
      const mockSearchFn = jest.fn().mockReturnValue(
        of(
          createMockScheduledResponse({
            totalDocs: 175,
            successDocs: 175,
            errorDocs: 0,
            successAgents: 175,
            errorAgents: 0,
            respondedAgents: 175,
            rowsCount: 0,
          })
        )
      );

      const { aggregations } = await callRoute(mockSearchFn);

      expect(aggregations.totalRowCount).toBe(0);
    });
  });
});
