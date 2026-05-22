/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

import type { QueryLink, Streams } from '@kbn/streams-schema';
import { QUERY_TYPE_MATCH } from '@kbn/streams-schema';
import { bulkDeleteQueriesRoute } from './route';

const definition = { name: 'logs.test' } as Streams.all.Definition;

const makeLink = (overrides: { id?: string; ruleBacked?: boolean } = {}): QueryLink => ({
  query: {
    id: overrides.id ?? 'q1',
    type: QUERY_TYPE_MATCH,
    title: 'Test query',
    description: 'desc',
    esql: { query: 'FROM logs | WHERE body.text:"error"' },
    severity_score: 60,
  },
  stream_name: 'logs.test',
  rule_backed: overrides.ruleBacked ?? false,
  rule_id: `rule-${overrides.id ?? 'q1'}`,
});

function makeHandler(
  currentLinks: QueryLink[],
  toDelete: string[],
  overrides: {
    getQueryLinks?: jest.Mock;
    getStreamToQueryLinksMap?: jest.Mock;
    syncQueries?: jest.Mock;
    bulk?: jest.Mock;
  } = {}
) {
  const getQueryLinks = overrides.getQueryLinks ?? jest.fn().mockResolvedValue(
    currentLinks.filter((l) => toDelete.includes(l.query.id))
  );
  const getStreamToQueryLinksMap = overrides.getStreamToQueryLinksMap ?? jest.fn().mockResolvedValue({
    'logs.test': currentLinks,
  });
  const syncQueries = overrides.syncQueries ?? jest.fn().mockResolvedValue(undefined);
  const bulk = overrides.bulk ?? jest.fn().mockResolvedValue({ applied: 1, skipped: 0 });

  const kiClient = {
    getQueryLinks,
    getStreamToQueryLinksMap,
    syncQueries,
    bulk,
  };

  const streamsClient = {
    getStream: jest.fn().mockResolvedValue(definition),
  };

  const licensing = { getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => true }) };
  const uiSettingsClient = { get: jest.fn().mockResolvedValue(true) };

  const getScopedClients = jest.fn().mockResolvedValue({
    getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    streamsClient,
    licensing,
    uiSettingsClient,
  });

  const server = { isSignificantEventsEnabled: jest.fn().mockReturnValue(true) };
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    get: jest.fn().mockReturnThis(),
    debug: jest.fn(),
  };
  const telemetry = {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  };

  const handler = Object.values(bulkDeleteQueriesRoute)[0].handler as Function;

  return {
    handler,
    kiClient,
    params: { body: { queryIds: toDelete } },
    request: {},
    getScopedClients,
    server,
    logger,
    telemetry,
  };
}

describe('bulkDeleteQueriesRoute handler', () => {
  it('calls syncQueries with next state (current minus deleted ids)', async () => {
    const q1 = makeLink({ id: 'q1', ruleBacked: true });
    const q2 = makeLink({ id: 'q2', ruleBacked: false });
    const { handler, kiClient, ...ctx } = makeHandler([q1, q2], ['q1']);

    await handler({ ...ctx, params: { body: { queryIds: ['q1'] } } });

    expect(kiClient.syncQueries).toHaveBeenCalledTimes(1);
    const [calledDefinition, nextQueries, options] = kiClient.syncQueries.mock.calls[0];
    expect(calledDefinition).toBe(definition);
    // q2 survives; q1 is removed
    expect(nextQueries).toHaveLength(1);
    expect(nextQueries[0].id).toBe('q2');
    // currentLinks passed through so syncQueries skips its internal fetch
    expect(options).toEqual({ currentLinks: [q1, q2] });
  });

  it('does NOT call kiClient.bulk for the delete path', async () => {
    const q1 = makeLink({ id: 'q1' });
    const { handler, kiClient, ...ctx } = makeHandler([q1], ['q1']);

    await handler({ ...ctx, params: { body: { queryIds: ['q1'] } } });

    expect(kiClient.bulk).not.toHaveBeenCalled();
  });

  it('reports skipped for ids not found by getQueryLinks', async () => {
    const q1 = makeLink({ id: 'q1' });
    const { handler, kiClient, ...ctx } = makeHandler([q1], ['q1']);

    // Override getQueryLinks to return nothing (ids not found).
    kiClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    const result = await handler({ ...ctx, params: { body: { queryIds: ['missing-id'] } } });

    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(kiClient.syncQueries).not.toHaveBeenCalled();
  });

  it('counts failed when stream definition is missing', async () => {
    const q1 = makeLink({ id: 'q1' });
    const { handler, kiClient, ...ctx } = makeHandler([q1], ['q1']);

    // Stream not found
    (ctx.getScopedClients as jest.Mock).mockResolvedValue({
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
      streamsClient: { getStream: jest.fn().mockRejectedValue(new Error('not found')) },
      licensing: { getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => true }) },
      uiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
    });

    const result = await handler({ ...ctx, params: { body: { queryIds: ['q1'] } } });

    expect(result.failed).toBe(1);
    expect(kiClient.syncQueries).not.toHaveBeenCalled();
  });
});
