/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RouteDependencies } from './types';
import type { InternalStartServices } from '../services';
import { publicApiPath } from '../../common/constants';
import { registerConsumptionRoutes } from './consumption';
import { HIGH_INPUT_TOKEN_THRESHOLD } from '../services/metering/utils';
import { AGENTS_WRITE_SECURITY } from './route_security';
import {
  buildConsumptionQuery,
  buildConsumptionDataSearchParams,
  buildConsumptionAggsSearchParams,
  buildConsumptionResponseBody,
} from '../services/metering/utils';

const ROUTE_PATH = `${publicApiPath}/agents/{agent_id}/consumption`;

const createEsHit = ({
  id = 'conv-1',
  title = 'Test conversation',
  userName = 'elastic',
  userId = 'uid-1',
  inputTokens = 1000,
  outputTokens = 500,
  roundCount = 3,
  llmCalls = 5,
  highTokenRounds = [] as Array<{ round_id: string; input_tokens: number }>,
  sort = [1234567890, '2024-01-01T00:00:00Z'],
} = {}) => ({
  _id: id,
  _source: {
    agent_id: 'agent-1',
    user_id: userId,
    user_name: userName,
    title,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  fields: {
    total_input_tokens: [inputTokens],
    total_output_tokens: [outputTokens],
    round_count: [roundCount],
    total_llm_calls: [llmCalls],
    high_token_rounds: highTokenRounds,
  },
  sort,
});

describe('Consumption route', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let routeConfig: Record<string, any>;
  let versionConfig: Record<string, any>;
  let mockEsSearch: jest.Mock;

  const createMockContext = () => ({
    core: Promise.resolve({}),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: ROUTE_PATH,
      params: { agent_id: 'agent-1' },
      body: {
        size: 25,
        sort_field: 'updated_at',
        sort_order: 'desc',
      },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsSearch = jest.fn();

    mockEsSearch.mockResolvedValue({
      hits: {
        total: { value: 1 },
        hits: [createEsHit()],
      },
      aggregations: {
        usernames: { buckets: [{ key: 'elastic' }] },
      },
    });

    /**
     * Mirrors ConsumptionServiceImpl.getScopedClient(): captures the
     * request on scoping and reads params/body when getConsumption()
     * is called, so existing assertions on ES query shape still hold.
     */
    const mockConsumptionService = {
      getScopedClient: ({ request: req }: { request: any }) => ({
        async getConsumption() {
          const { agent_id: agentId } = req.params;
          const {
            size,
            sort_field: sortField,
            sort_order: sortOrder,
            search_after: searchAfter,
            search: searchText,
            usernames: usernameFilter,
            has_warnings: hasWarningsFilter,
          } = req.body;

          const { query, runtimeMappings } = buildConsumptionQuery({
            space: 'default',
            agentId,
            usernameFilter,
            searchText,
            hasWarningsFilter,
          });
          const [esResponse, aggsResponse] = await Promise.all([
            mockEsSearch(
              buildConsumptionDataSearchParams({
                query,
                runtimeMappings,
                size,
                sortField,
                sortOrder,
                searchAfter,
              })
            ),
            mockEsSearch(buildConsumptionAggsSearchParams('default', agentId)),
          ]);
          return buildConsumptionResponseBody(esResponse, aggsResponse);
        },
      }),
    };

    const mockGetInternalServices = () =>
      ({ consumption: mockConsumptionService } as unknown as InternalStartServices);

    const routeHandlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};
    const routeConfigs: Record<string, any> = {};
    const versionConfigs: Record<string, any> = {};

    const createVersionedRoute = (method: string, path: string, config: any) => ({
      addVersion: jest
        .fn()
        .mockImplementation(
          (verConfig: any, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            routeConfigs[`${method}:${path}`] = config;
            versionConfigs[`${method}:${path}`] = verConfig;
            routeHandlers[`${method}:${path}`] = handler;
            return { addVersion: jest.fn() };
          }
        ),
    });

    const mockRouter = {
      versioned: {
        post: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('POST', config.path, config)
          ),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerConsumptionRoutes({
      router: mockRouter,
      getInternalServices: mockGetInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    routeHandler = routeHandlers[`POST:${ROUTE_PATH}`];
    routeConfig = routeConfigs[`POST:${ROUTE_PATH}`];
    versionConfig = versionConfigs[`POST:${ROUTE_PATH}`];
  });

  it('registers the route handler', () => {
    expect(routeHandler).toBeDefined();
  });

  describe('route configuration', () => {
    it('uses public access with Tech Preview availability', () => {
      expect(routeConfig.access).toBe('public');
      expect(routeConfig.options.availability).toEqual({
        stability: 'experimental',
        since: '9.4.0',
      });
    });

    it('requires the manageAgents privilege via route-level security', () => {
      expect(routeConfig.security).toEqual(AGENTS_WRITE_SECURITY);
    });

    it('uses API version 2023-10-31', () => {
      expect(versionConfig.version).toBe('2023-10-31');
    });
  });

  describe('basic response', () => {
    it('returns conversation consumption data with token aggregates', async () => {
      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload.total).toBe(1);
      expect(response.payload.results).toHaveLength(1);

      const result = response.payload.results[0];
      expect(result).toMatchObject({
        conversation_id: 'conv-1',
        title: 'Test conversation',
        user: { id: 'uid-1', username: 'elastic' },
        token_usage: {
          input_tokens: 1000,
          output_tokens: 500,
          total_tokens: 1500,
        },
        round_count: 3,
        llm_calls: 5,
        warnings: [],
      });
    });

    it('returns aggregations with usernames', async () => {
      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.payload.aggregations).toEqual({
        usernames: ['elastic'],
        total_with_warnings: 0,
      });
    });

    it('does not expose conversation content', async () => {
      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      const result = response.payload.results[0];
      expect(result).not.toHaveProperty('rounds');
      expect(result).not.toHaveProperty('steps');
      expect(result).not.toHaveProperty('messages');
      expect(result).not.toHaveProperty('response');
    });
  });

  describe('high-token warnings', () => {
    it('includes warnings for rounds exceeding the threshold', async () => {
      mockEsSearch.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            createEsHit({
              highTokenRounds: [
                { round_id: 'round-3', input_tokens: 250000 },
                { round_id: 'round-5', input_tokens: 300000 },
              ],
            }),
          ],
        },
        aggregations: { usernames: { buckets: [] } },
      });

      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      const { warnings } = response.payload.results[0];
      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toEqual({
        type: 'high_input_tokens',
        round_id: 'round-3',
        input_tokens: 250000,
      });
      expect(warnings[1]).toEqual({
        type: 'high_input_tokens',
        round_id: 'round-5',
        input_tokens: 300000,
      });
    });

    it('returns empty warnings when no rounds exceed threshold', async () => {
      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.payload.results[0].warnings).toEqual([]);
    });
  });

  describe('cursor-based pagination', () => {
    it('returns search_after cursor from the last hit', async () => {
      const expectedSort = [1234567890, '2024-01-01T00:00:00Z'];
      mockEsSearch.mockResolvedValue({
        hits: {
          total: { value: 50 },
          hits: [createEsHit({ sort: expectedSort })],
        },
        aggregations: { usernames: { buckets: [] } },
      });

      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload.search_after).toEqual(expectedSort);
    });

    it('passes search_after to ES when provided', async () => {
      const cursor = [1234567890, '2024-01-01T00:00:00Z'];

      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: {
            size: 25,
            sort_field: 'updated_at',
            sort_order: 'desc',
            search_after: cursor,
          },
        }),
        kibanaResponseFactory
      );

      const dataCallArgs = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      expect(dataCallArgs).toBeDefined();
      expect(dataCallArgs![0].search_after).toEqual(cursor);
    });

    it('omits search_after when there are no results', async () => {
      mockEsSearch.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: { usernames: { buckets: [] } },
      });

      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload.total).toBe(0);
      expect(response.payload.results).toEqual([]);
      expect(response.payload.search_after).toBeUndefined();
    });
  });

  describe('search and filters', () => {
    it('applies free-text search as a wildcard on title', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: {
            size: 25,
            sort_field: 'updated_at',
            sort_order: 'desc',
            search: 'hello',
          },
        }),
        kibanaResponseFactory
      );

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      expect(dataCall).toBeDefined();
      const { query } = dataCall![0];
      expect(query.bool.must).toEqual(
        expect.arrayContaining([
          { wildcard: { title: { value: '*hello*', case_insensitive: true } } },
        ])
      );
    });

    it('applies username filter as a terms clause', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: {
            size: 25,
            sort_field: 'updated_at',
            sort_order: 'desc',
            usernames: ['elastic', 'kibana_admin'],
          },
        }),
        kibanaResponseFactory
      );

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      expect(dataCall).toBeDefined();
      const { query } = dataCall![0];
      expect(query.bool.filter).toEqual(
        expect.arrayContaining([{ terms: { user_name: ['elastic', 'kibana_admin'] } }])
      );
    });

    it('applies has_warnings filter as a runtime field', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: {
            size: 25,
            sort_field: 'updated_at',
            sort_order: 'desc',
            has_warnings: true,
          },
        }),
        kibanaResponseFactory
      );

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      expect(dataCall).toBeDefined();
      expect(dataCall![0].runtime_mappings).toBeDefined();
      expect(dataCall![0].runtime_mappings.has_warnings).toMatchObject({
        type: 'boolean',
      });
      expect(dataCall![0].runtime_mappings.has_warnings.script.params).toEqual({
        threshold: HIGH_INPUT_TOKEN_THRESHOLD,
      });
      expect(dataCall![0].query.bool.filter).toEqual(
        expect.arrayContaining([{ term: { has_warnings: true } }])
      );
    });

    it('runs aggregation query without search/filter constraints', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: {
            size: 25,
            sort_field: 'updated_at',
            sort_order: 'desc',
            search: 'hello',
            usernames: ['elastic'],
          },
        }),
        kibanaResponseFactory
      );

      const aggsCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 0);
      expect(aggsCall).toBeDefined();
      const aggsQuery = aggsCall![0].query;
      expect(aggsQuery.bool.filter).toHaveLength(2);
      expect(aggsQuery.bool.must).toBeUndefined();
    });
  });

  describe('sorting', () => {
    it('sorts by updated_at by default', async () => {
      await routeHandler(createMockContext() as any, createRequest(), kibanaResponseFactory);

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      expect(dataCall![0].sort).toEqual([
        { updated_at: { order: 'desc' } },
        { created_at: { order: 'asc' } },
      ]);
    });

    it('uses _script sort for total_tokens', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: { size: 25, sort_field: 'total_tokens', sort_order: 'asc' },
        }),
        kibanaResponseFactory
      );

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      const sort = dataCall![0].sort;
      expect(sort).toHaveLength(2);
      expect(sort[0]).toHaveProperty('_script');
      expect(sort[0]._script.type).toBe('number');
      expect(sort[0]._script.order).toBe('asc');
      expect(sort[1]).toEqual({ created_at: { order: 'asc' } });
    });

    it('uses _script sort for round_count', async () => {
      await routeHandler(
        createMockContext() as any,
        createRequest({
          body: { size: 25, sort_field: 'round_count', sort_order: 'desc' },
        }),
        kibanaResponseFactory
      );

      const dataCall = mockEsSearch.mock.calls.find((call: any[]) => call[0].size === 25);
      const sort = dataCall![0].sort;
      expect(sort[0]).toHaveProperty('_script');
      expect(sort[0]._script.order).toBe('desc');
    });
  });

  describe('multiple conversations', () => {
    it('returns results from multiple users', async () => {
      mockEsSearch.mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: [
            createEsHit({ id: 'conv-1', userName: 'alice', userId: 'uid-a' }),
            createEsHit({ id: 'conv-2', userName: 'bob', userId: 'uid-b' }),
          ],
        },
        aggregations: {
          usernames: { buckets: [{ key: 'alice' }, { key: 'bob' }] },
        },
      });

      const response = await routeHandler(
        createMockContext() as any,
        createRequest(),
        kibanaResponseFactory
      );

      expect(response.payload.results).toHaveLength(2);
      expect(response.payload.results[0].user.username).toBe('alice');
      expect(response.payload.results[1].user.username).toBe('bob');
      expect(response.payload.aggregations.usernames).toEqual(['alice', 'bob']);
    });
  });
});
