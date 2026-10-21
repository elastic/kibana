/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  MAX_STREAMS_UNIT_STATS_COMPONENTS,
  streamsUnitStatsResponseSchema,
  type StreamsUnit,
} from '@kbn/streams-schema';
import { UnitStatsClient } from './client';

const unit: StreamsUnit.Configuration = {
  sources: [],
  destinations: [
    { id: 'es-prod', type: 'elasticsearch', supported_telemetry: ['logs'] },
    { id: 'es-dev', type: 'elasticsearch', supported_telemetry: ['logs'] },
    { id: 'dbg', type: 'debug', supported_telemetry: ['logs'] },
  ],
  processors: [{ id: 'uppercase-message', type: 'add_fields', supported_telemetry: ['logs'] }],
  pipelines: [],
};

const now = new Date('2026-10-19T12:00:00.000Z');

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

const responses = {
  probe: { columns: [{ name: '@timestamp', type: 'date' }], values: [] },
  destinationRate: {
    columns: [
      { name: 'incoming_rate', type: 'double' },
      { name: 'failed_rate', type: 'double' },
      { name: 'avg_latency', type: 'double' },
      { name: 'id', type: 'keyword' },
    ],
    values: [
      [4.6, 0, 0.18, 'es-prod'],
      [4.2, 0, 0.17, 'es-dev'],
    ],
  },
  destinationSums: {
    columns: [
      { name: 'sum_items', type: 'double' },
      { name: 'id', type: 'keyword' },
      { name: 'bucket', type: 'date' },
    ],
    values: [
      [270, 'es-prod', '2026-10-19T11:46:00.000Z'],
      [90, 'es-dev', '2026-10-19T11:46:00.000Z'],
      [240, 'es-prod', '2026-10-19T11:47:00.000Z'],
    ],
  },
  processorRate: {
    columns: [
      { name: 'incoming_rate', type: 'double' },
      { name: 'step', type: 'keyword' },
    ],
    values: [[4.6, 'uppercase-message']],
  },
  processorSums: {
    columns: [
      { name: 'sum_items_in', type: 'double' },
      { name: 'avg_duration_per_item', type: 'double' },
      { name: 'step', type: 'keyword' },
    ],
    values: [[3870, 5.2e-6, 'uppercase-message']],
  },
};

type QueryName = keyof typeof responses;

const isProbe = (query: string) => query.endsWith('| LIMIT 0');
/** The stats queries start with a `SET` command, so the source is not at the start. */
const isRateQuery = (query: string) => query.includes('; TS ');

/**
 * Answers each `esql.query` by what the query asks for: a `TS` or a `FROM` query, for
 * destinations or for processors. An override replaces the answer, and can throw.
 */
const makeEsql = (overrides: Partial<Record<QueryName, () => EsqlResponse>> = {}) =>
  jest.fn(async ({ query }: { query: string }) => {
    if (isProbe(query)) return (overrides.probe ?? (() => responses.probe))();

    const kind = query.includes('attributes.streams.destination.id') ? 'destination' : 'processor';
    const name = `${kind}${isRateQuery(query) ? 'Rate' : 'Sums'}` as QueryName;

    return (overrides[name] ?? (() => responses[name]))();
  });

const responseError = (statusCode: number, body: object = {}) =>
  new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {} as never,
  });

/** How ES|QL reports a stream that does not exist. */
const unknownIndexError = () =>
  responseError(400, {
    error: {
      type: 'verification_exception',
      reason: 'Found 1 problem\nline 1:6: Unknown index [metrics-streams.otel-default]',
    },
  });

const failWith = (error: Error) => () => {
  throw error;
};

/** The stats queries an esql mock was called with, not the probe. */
const statsQueries = (esql: jest.Mock): string[] =>
  esql.mock.calls.map(([{ query }]) => query).filter((query) => !isProbe(query));

const run = (
  esql: jest.Mock,
  request: StreamsUnit.StatsRequest = {},
  statsUnit: StreamsUnit.Configuration = unit,
  logger = loggingSystemMock.createLogger()
) =>
  new UnitStatsClient({
    esClient: { esql: { query: esql } } as unknown as ElasticsearchClient,
    logger,
  }).getStats({ unitId: 'default', unit: statsUnit, request, now });

describe('UnitStatsClient.getStats', () => {
  it('places a destination and a processor with their values', async () => {
    const response = await run(makeEsql());

    expect(response.components.destinations['es-prod']).toEqual({
      latency: { average: { value: 0.18, unit: 's' } },
      events: {
        incoming: {
          total: { value: 510, unit: '{item}' },
          rate: { value: 4.6, unit: '{item}', time_unit: 's' },
          series: {
            bucket_ms: 60_000,
            points: [
              { start: '2026-10-19T11:46:00.000Z', value: 270 },
              { start: '2026-10-19T11:47:00.000Z', value: 240 },
            ],
          },
          failures: { rate: { value: 0, unit: '{item}', time_unit: 's' } },
        },
      },
    });
    expect(response.components.processors['uppercase-message']).toEqual({
      processing_duration: { average: { value: 5.2e-6, unit: 's' } },
      events: {
        incoming: {
          rate: { value: 4.6, unit: '{item}', time_unit: 's' },
          failures: { rate: { value: null, unit: null, time_unit: null } },
        },
      },
    });
    expect(streamsUnitStatsResponseSchema.parse(response)).toEqual(response);
  });

  describe('components', () => {
    it.each([
      ['omitted', {}],
      ['an empty list', { components: [] }],
    ])(
      'answers for every component, keyed by kind and id, when components is %s',
      async (_, req) => {
        const response = await run(makeEsql(), req);

        expect(Object.keys(response.components.destinations)).toEqual(['es-prod', 'es-dev', 'dbg']);
        expect(Object.keys(response.components.processors)).toEqual(['uppercase-message']);
        expect(streamsUnitStatsResponseSchema.parse(response)).toEqual(response);
      }
    );

    it('collapses duplicate components', async () => {
      const esql = makeEsql();
      const ref = { kind: 'destination' as const, id: 'es-prod' };

      const response = await run(esql, { components: [ref, ref] });

      expect(Object.keys(response.components.destinations)).toEqual(['es-prod']);
      const queries = statsQueries(esql);
      expect(queries).toHaveLength(2);
      queries.forEach((query) => expect(query).toContain('IN ("es-prod")'));
    });

    it('answers only for the kind that is named, and does not fall back to the rest of the unit', async () => {
      const destinationsOnly = makeEsql();
      const processorsOnly = makeEsql();

      const destinationResponse = await run(destinationsOnly, {
        components: [{ kind: 'destination', id: 'es-prod' }],
      });
      const processorResponse = await run(processorsOnly, {
        components: [{ kind: 'processor', id: 'uppercase-message' }],
      });

      expect(Object.keys(destinationResponse.components.destinations)).toEqual(['es-prod']);
      expect(destinationResponse.components.processors).toEqual({});
      statsQueries(destinationsOnly).forEach((query) =>
        expect(query).toContain('attributes.streams.destination.id')
      );
      expect(processorResponse.components.destinations).toEqual({});
      expect(Object.keys(processorResponse.components.processors)).toEqual(['uppercase-message']);
      statsQueries(processorsOnly).forEach((query) =>
        expect(query).toContain('attributes.streams.step.id')
      );
    });

    it('answers not_found from the config without querying', async () => {
      const esql = makeEsql();

      const response = await run(esql, {
        components: [
          { kind: 'destination', id: 'nope' },
          { kind: 'processor', id: 'nope' },
        ],
      });

      expect(esql).not.toHaveBeenCalled();
      expect(response.components.destinations.nope.error?.code).toBe('not_found');
      expect(response.components.processors.nope.error?.code).toBe('not_found');
      expect(response.error).toBeUndefined();
    });
  });

  describe('window and filters', () => {
    const timeRange = { start: '2026-10-19T10:00:00.000Z', end: '2026-10-19T11:00:00.000Z' };

    it('reports the last 15 minutes by default, and no config hash', async () => {
      const response = await run(makeEsql());

      expect(response.meta).toEqual({
        window: { start: '2026-10-19T11:45:00.000Z', end: '2026-10-19T12:00:00.000Z' },
      });
    });

    it('reports the requested window and the pinned config hash', async () => {
      const response = await run(makeEsql(), {
        filter: { time_range: timeRange, config_hash: 'h1' },
      });

      expect(response.meta).toEqual({ window: timeRange, config_hash: 'h1' });
    });

    it('filters every query by the unit and the window, and by the hash only when pinned', async () => {
      const unpinned = makeEsql();
      const pinned = makeEsql();

      await run(unpinned, { filter: { time_range: timeRange } });
      await run(pinned, { filter: { time_range: timeRange, config_hash: 'h1' } });

      const unpinnedQueries = statsQueries(unpinned);
      const pinnedQueries = statsQueries(pinned);
      expect(unpinnedQueries).toHaveLength(4);
      unpinnedQueries.forEach((query) => {
        expect(query).toContain('resource.attributes.unit.id == "default"');
        expect(query).toContain(`@timestamp >= "${timeRange.start}"`);
        expect(query).toContain(`@timestamp < "${timeRange.end}"`);
        expect(query).not.toContain('config.hash');
      });
      pinnedQueries.forEach((query) =>
        expect(query).toContain('resource.attributes.streams.config.hash == "h1"')
      );
    });

    describe('with the most destinations one request allows', () => {
      const destinationsOf = (count: number): StreamsUnit.Configuration => ({
        ...unit,
        processors: [],
        destinations: Array.from({ length: count }, (_, index) => ({
          id: `destination-${index}`,
          type: 'elasticsearch',
          supported_telemetry: ['logs' as const],
        })),
      });
      const maxDestinations = destinationsOf(MAX_STREAMS_UNIT_STATS_COMPONENTS);
      const sumsQueries = (esql: jest.Mock) =>
        statsQueries(esql).filter((query) => !isRateQuery(query) && query.includes('destination'));

      it('asks for the sums once and the rates once when the window allows every id', async () => {
        const esql = makeEsql();

        await run(esql, {}, maxDestinations);

        // The default window allows 588 ids per series query.
        expect(sumsQueries(esql)).toHaveLength(1);
        const rateQueries = statsQueries(esql).filter(
          (query) => isRateQuery(query) && query.includes('destination')
        );
        expect(rateQueries).toHaveLength(1);
      });

      it('splits the sums query for the longest window', async () => {
        const esql = makeEsql();

        await run(
          esql,
          { filter: { time_range: { start: '2025-10-18T12:00:00.000Z', end: now.toISOString() } } },
          maxDestinations
        );

        // A 366 day window has 367 day buckets and allows 27 ids per series query.
        expect(sumsQueries(esql)).toHaveLength(4);
      });

      it('rejects an omitted components list when the unit has more components than a request can name', async () => {
        const esql = makeEsql();

        await expect(
          run(esql, {}, destinationsOf(MAX_STREAMS_UNIT_STATS_COMPONENTS + 1))
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(esql).not.toHaveBeenCalled();
      });
    });

    it('probes the stream once and runs no stats query when the stream does not exist', async () => {
      const esql = makeEsql({ probe: failWith(unknownIndexError()) });

      const response = await run(esql);

      expect(esql).toHaveBeenCalledTimes(1);
      expect(response.components.destinations['es-prod'].events.incoming.rate.value).toBeNull();
      expect(
        response.components.processors['uppercase-message'].events.incoming.rate.value
      ).toBeNull();
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
      expect(response.components.destinations.dbg.error).toBeUndefined();
      expect(response.error).toBeUndefined();
      expect(streamsUnitStatsResponseSchema.parse(response)).toEqual(response);
    });

    it('runs no stats query and puts the probe error on every queryable component when the probe fails', async () => {
      const esql = makeEsql({ probe: failWith(responseError(429)) });

      const response = await run(esql);

      expect(statsQueries(esql)).toHaveLength(0);
      expect(response.components.destinations['es-prod'].error?.code).toBe('unavailable');
      expect(response.components.destinations['es-dev'].error?.code).toBe('unavailable');
      expect(response.components.processors['uppercase-message'].error?.code).toBe('unavailable');
      expect(response.components.destinations.dbg.error?.code).toBe('unavailable');
      expect(response.error?.code).toBe('unavailable');
    });

    it('returns no data and no error when the queries return no rows', async () => {
      const empty = () => ({ columns: [], values: [] });
      const esql = makeEsql({
        destinationRate: empty,
        destinationSums: empty,
        processorRate: empty,
        processorSums: empty,
      });

      const response = await run(esql, { filter: { config_hash: 'nope' } });

      expect(response.components.destinations['es-prod'].events.incoming.rate.value).toBeNull();
      expect(response.components.destinations['es-prod'].events.incoming.total.value).toBeNull();
      expect(response.components.destinations['es-prod'].events.incoming.series.points).toEqual([]);
      expect(
        response.components.processors['uppercase-message'].events.incoming.rate.value
      ).toBeNull();
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
      expect(response.error).toBeUndefined();
      expect(response.meta.config_hash).toBe('nope');
    });
  });

  describe('failures', () => {
    it('puts the same error on every destination when a destination query fails', async () => {
      const response = await run(makeEsql({ destinationRate: failWith(responseError(429)) }));

      expect(response.components.destinations['es-prod'].error?.code).toBe('unavailable');
      expect(response.components.destinations['es-dev'].error?.code).toBe('unavailable');
      expect(response.components.destinations.dbg.error?.code).toBe('unavailable');
      expect(response.components.processors['uppercase-message'].error).toBeUndefined();
      expect(response.components.processors['uppercase-message'].events.incoming.rate.value).toBe(
        4.6
      );
      expect(response.error).toBeUndefined();
    });

    it('puts the same error on every processor when a processor query fails', async () => {
      const response = await run(makeEsql({ processorSums: failWith(responseError(500)) }));

      expect(response.components.processors['uppercase-message'].error?.code).toBe('error');
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
      expect(response.components.destinations['es-prod'].events.incoming.rate.value).toBe(4.6);
      expect(response.error).toBeUndefined();
    });

    it('logs a query that fails or times out at warn, and an expected cluster state at debug', async () => {
      const logsFor = async (error: Error) => {
        const logger = loggingSystemMock.createLogger();
        await run(makeEsql({ destinationRate: failWith(error) }), {}, unit, logger);
        return logger;
      };

      const failed = await logsFor(responseError(500));
      const timedOut = await logsFor(new errors.TimeoutError('timeout', {} as never));
      const busy = await logsFor(responseError(429));
      const forbidden = await logsFor(responseError(403));

      expect(failed.warn).toHaveBeenCalledTimes(1);
      expect(timedOut.warn).toHaveBeenCalledTimes(1);
      expect(busy.warn).not.toHaveBeenCalled();
      expect(busy.debug).toHaveBeenCalledTimes(1);
      expect(forbidden.warn).not.toHaveBeenCalled();
    });

    it('gives a failed kind no data from the query that did succeed', async () => {
      const response = await run(makeEsql({ destinationSums: failWith(responseError(429)) }));

      expect(response.components.destinations['es-prod'].events.incoming.rate.value).toBeNull();
      expect(response.components.destinations['es-prod'].events.incoming.total.value).toBeNull();
    });

    it('also sets the response error when every kind failed with the same code', async () => {
      const response = await run(
        makeEsql({
          destinationSums: failWith(responseError(429)),
          processorRate: failWith(responseError(429)),
        })
      );

      expect(response.error?.code).toBe('unavailable');
      expect(response.components.destinations['es-prod'].error?.code).toBe('unavailable');
      expect(response.components.processors['uppercase-message'].error?.code).toBe('unavailable');
    });

    it('sets only the component errors when the kinds failed with different codes', async () => {
      const response = await run(
        makeEsql({
          destinationRate: failWith(responseError(429)),
          processorRate: failWith(new errors.TimeoutError('timeout', {} as never)),
        })
      );

      expect(response.error).toBeUndefined();
      expect(response.components.destinations['es-prod'].error?.code).toBe('unavailable');
      expect(response.components.processors['uppercase-message'].error?.code).toBe('timeout');
    });

    it('sets the response error when the only kind that ran failed', async () => {
      const response = await run(makeEsql({ destinationRate: failWith(responseError(403)) }), {
        components: [{ kind: 'destination', id: 'es-prod' }],
      });

      expect(response.error?.code).toBe('forbidden');
      expect(response.components.destinations['es-prod'].error?.code).toBe('forbidden');
    });
  });
});
