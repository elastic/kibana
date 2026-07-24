/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import { internalKIQueriesRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockFetchQueryLinks = jest.fn();
const mockComputeOccurrences = jest.fn();
const mockGetQueryOccurrences = jest.fn();

jest.mock('../../../../lib/significant_events/fetch_query_occurrences_from_alerts', () => ({
  fetchQueryLinks: (...args: unknown[]) => mockFetchQueryLinks(...args),
  computeOccurrences: (...args: unknown[]) => mockComputeOccurrences(...args),
  getQueryOccurrences: (...args: unknown[]) => mockGetQueryOccurrences(...args),
  toQueryWithOccurrences: ({ queryLink }: { queryLink: QueryLink }) => ({
    ...queryLink.query,
    stream_name: queryLink.stream_name,
    rule_backed: queryLink.rule_backed,
    occurrences: [],
    change_points: {},
  }),
}));

jest.mock('../../../../lib/significant_events/create_significant_events_traced_es_client', () => ({
  createSignificantEventsTracedEsClient: jest.fn().mockReturnValue({}),
}));

const route = internalKIQueriesRoutes['POST /internal/streams/queries/_reconcile'];
const discoveryQueriesRoute = internalKIQueriesRoutes['GET /internal/streams/_queries'];
const discoveryOccurrencesRoute =
  internalKIQueriesRoutes['GET /internal/streams/_queries/_occurrences'];
const RECONCILE_MAX_STREAMS = 10;

type HandlerParams = Parameters<typeof route.handler>[0];
type DiscoveryHandlerParams = Parameters<typeof discoveryQueriesRoute.handler>[0];

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

const makeQueryLink = (id: string, severityScore: number): QueryLink => ({
  query: {
    id,
    type: 'match',
    title: id,
    description: 'desc',
    esql: { query: `FROM logs-* | WHERE id == "${id}"` },
    severity_score: severityScore,
  },
  stream_name: 'logs.test',
  rule_backed: true,
  rule_id: `rule-${id}`,
});

const makeServer = () =>
  ({
    core: {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ authentication_type: 'basic' }),
        },
      },
    },
  } as unknown as HandlerParams['server']);

const discoveryBaseQuery = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
  bucketSize: '1h',
};

describe('reconcileQueriesRoute', () => {
  it('requires explicit stream names with a bounded batch size', () => {
    expect(route.params.safeParse({ body: null }).success).toBe(false);
    expect(route.params.safeParse({ body: {} }).success).toBe(false);
    expect(
      route.params.safeParse({
        body: {
          streamNames: Array.from({ length: RECONCILE_MAX_STREAMS + 1 }, (_, i) => `logs.${i}`),
        },
      }).success
    ).toBe(false);
    expect(route.params.safeParse({ body: { streamNames: ['logs.test'] } }).success).toBe(true);
  });

  it('replays current stream queries through replaceStreamQueries', async () => {
    const currentLinks = [makeQueryLink('critical', 80), makeQueryLink('default', 60)];
    const replaceStreamQueries = jest
      .fn()
      .mockImplementation(async (_definition, getNextQueries) => {
        expect(getNextQueries(currentLinks)).toEqual(currentLinks.map((link) => link.query));
      });
    const handlerParams = {
      params: { body: { streamNames: ['logs.test'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        streamsClient: {
          getStream: jest.fn().mockResolvedValue({ name: 'logs.test' }),
        },
        licensing: {},
        uiSettingsClient: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ replaceStreamQueries }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
      logger: { warn: jest.fn() },
    } as unknown as HandlerParams;

    const result = await route.handler(handlerParams);

    expect(replaceStreamQueries).toHaveBeenCalledWith({ name: 'logs.test' }, expect.any(Function));
    expect(result).toEqual({
      reconciled: 1,
      failed: 0,
      streams: [{ streamName: 'logs.test', status: 'reconciled', queries: 2 }],
    });
  });

  it('continues when one stream fails to reconcile', async () => {
    const replaceStreamQueries = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rules unavailable'));
    const handlerParams = {
      params: { body: { streamNames: ['logs.a', 'logs.b'] } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        streamsClient: {
          getStream: jest
            .fn()
            .mockResolvedValueOnce({ name: 'logs.a' })
            .mockResolvedValueOnce({ name: 'logs.b' }),
        },
        licensing: {},
        uiSettingsClient: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ replaceStreamQueries }),
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService(),
      logger: { warn: jest.fn() },
    } as unknown as HandlerParams;

    const result = await route.handler(handlerParams);

    expect(result).toEqual({
      reconciled: 1,
      failed: 1,
      streams: [
        { streamName: 'logs.a', status: 'reconciled', queries: 0 },
        {
          streamName: 'logs.b',
          status: 'failed',
          queries: 0,
          error: 'rules unavailable',
        },
      ],
    });
  });
});

describe('pause guard on rule-touching query routes', () => {
  const reconcileRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_reconcile'];
  const demoteRoute = internalKIQueriesRoutes['POST /internal/streams/queries/_demote'];
  const generateRoute =
    internalKIQueriesRoutes['POST /internal/streams/{streamName}/queries/_generate'];

  // getKnowledgeIndicatorClient is the first rule-touching call in each handler and
  // runs only after the guard, so "not called" proves the guard short-circuits first.
  const expectPausedBeforeRuleWork = async <P>(
    handler: (params: P) => Promise<unknown>,
    params: Record<string, unknown>
  ) => {
    const getKnowledgeIndicatorClient = jest.fn();
    const handlerParams = {
      params,
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        streamsClient: { getStream: jest.fn(), listStreams: jest.fn() },
        licensing: {},
        uiSettingsClient: {},
        getKnowledgeIndicatorClient,
      }),
      server: makeServer(),
      maintenanceService: makeMaintenanceService('paused'),
      logger: { warn: jest.fn(), get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      telemetry: {},
    } as unknown as P;

    await expect(handler(handlerParams)).rejects.toMatchObject({ output: { statusCode: 409 } });
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  };

  it('rejects _reconcile with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(reconcileRoute.handler, {
      body: { streamNames: ['logs.test'] },
    });
  });

  it('rejects _demote with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(demoteRoute.handler, { body: { queryIds: ['q1'] } });
  });

  it('rejects _generate with 409 while paused', async () => {
    await expectPausedBeforeRuleWork(generateRoute.handler, {
      path: { streamName: 'logs.test' },
      body: null,
    });
  });
});

describe('getDiscoveryQueriesRoute stream resolution', () => {
  const listStreams = jest.fn().mockResolvedValue([{ name: 'logs.a' }, { name: 'logs.b' }]);
  const kiClient = {};

  beforeEach(() => {
    jest.clearAllMocks();
    listStreams.mockResolvedValue([{ name: 'logs.a' }, { name: 'logs.b' }]);
    mockFetchQueryLinks.mockResolvedValue([makeQueryLink('q1', 80)]);
    mockComputeOccurrences.mockResolvedValue({
      sparseByRule: new Map(),
      aggregatedOccurrences: [],
      timeline: [],
    });
  });

  const makeDiscoveryHandlerParams = (query: Record<string, unknown>): DiscoveryHandlerParams =>
    ({
      params: { query },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        streamsClient: { listStreams },
        licensing: {},
        scopedClusterClient: { asCurrentUser: {} },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ alertsReader: {} }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: makeServer(),
      logger: { warn: jest.fn() },
    } as unknown as DiscoveryHandlerParams);

  it('lists streams then searches when query is set and streamNames is omitted', async () => {
    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({ ...discoveryBaseQuery, query: 'checkout' })
    );

    expect(listStreams).toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        streamNames: ['logs.a', 'logs.b'],
        query: 'checkout',
      }),
      kiClient
    );
  });

  it('passes explicit streamNames through without listing streams', async () => {
    await discoveryQueriesRoute.handler(
      makeDiscoveryHandlerParams({
        ...discoveryBaseQuery,
        query: 'checkout',
        streamNames: ['logs.only'],
      })
    );

    expect(listStreams).not.toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        streamNames: ['logs.only'],
        query: 'checkout',
      }),
      kiClient
    );
  });

  it('resolves streams for the unfiltered list path when streamNames is omitted', async () => {
    await discoveryQueriesRoute.handler(makeDiscoveryHandlerParams({ ...discoveryBaseQuery }));

    expect(listStreams).toHaveBeenCalled();
    expect(mockFetchQueryLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        streamNames: ['logs.a', 'logs.b'],
        query: undefined,
      }),
      kiClient
    );
  });
});

describe('getDiscoveryQueriesOccurrencesRoute stream resolution', () => {
  const listStreams = jest.fn().mockResolvedValue([{ name: 'logs.a' }, { name: 'logs.b' }]);
  const kiClient = {};

  beforeEach(() => {
    jest.clearAllMocks();
    listStreams.mockResolvedValue([{ name: 'logs.a' }, { name: 'logs.b' }]);
    mockGetQueryOccurrences.mockResolvedValue({
      queryLinks: [],
      sparseByRule: new Map(),
      aggregatedOccurrences: [{ date: '2024-01-01T00:00:00.000Z', count: 1 }],
      timeline: [],
    });
  });

  it('lists streams before searching occurrences when streamNames is omitted', async () => {
    const handlerParams = {
      params: { query: { ...discoveryBaseQuery, query: 'checkout' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        streamsClient: { listStreams },
        licensing: {},
        scopedClusterClient: { asCurrentUser: {} },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
        getSignificantEventsAlertingContext: jest.fn().mockResolvedValue({ alertsReader: {} }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: makeServer(),
      logger: { warn: jest.fn() },
    } as unknown as Parameters<typeof discoveryOccurrencesRoute.handler>[0];

    await discoveryOccurrencesRoute.handler(handlerParams);

    expect(listStreams).toHaveBeenCalled();
    expect(mockGetQueryOccurrences).toHaveBeenCalledWith(
      expect.objectContaining({
        streamNames: ['logs.a', 'logs.b'],
        query: 'checkout',
      }),
      expect.objectContaining({ kiClient })
    );
  });
});
