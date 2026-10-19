/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { streamsUnitStatsResponseSchema, type StreamsUnit } from '@kbn/streams-schema';
import { CONFIG_HASH_FIELD } from './constants';
import { getUnitStats } from './get_unit_stats';

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
const MINUTE = 60_000;

const destinationAggregations = {
  by_id: {
    buckets: [
      {
        key: 'es-prod',
        items: {
          doc_count: 6,
          sum: { value: 30 },
          series: {
            buckets: [
              { key: Date.parse('2026-10-19T11:56:00.000Z'), doc_count: 3, sum: { value: 20 } },
              { key: Date.parse('2026-10-19T11:57:00.000Z'), doc_count: 3, sum: { value: 10 } },
            ],
          },
          failures: { doc_count: 0, sum: { value: 0 } },
        },
        duration: { doc_count: 6, average: { value: 0.107 } },
      },
    ],
  },
};

const earliestResponse = (ms: number | null) => ({ aggregations: { earliest: { value: ms } } });

/** Answers each search by its shape: the earliest start, or the destination search. */
const makeSearch = ({
  earliestMs = now.getTime() - 5 * MINUTE,
  earliest,
  destination,
}: {
  earliestMs?: number | null;
  earliest?: () => unknown;
  destination?: () => unknown;
} = {}) =>
  jest.fn(async (body: { aggs?: Record<string, unknown> }) => {
    if (body.aggs && 'earliest' in body.aggs) {
      return (earliest ?? (() => earliestResponse(earliestMs)))();
    }
    return (destination ?? (() => ({ aggregations: destinationAggregations })))();
  });

const run = (search: jest.Mock, request: StreamsUnit.StatsRequest = {}) =>
  getUnitStats({
    unitId: 'default',
    unit,
    request,
    esClient: { search } as unknown as ElasticsearchClient,
    logger: loggingSystemMock.createLogger(),
    now,
  });

const responseError = (statusCode: number) =>
  new errors.ResponseError({ statusCode, body: {}, headers: {}, warnings: [], meta: {} as never });

const nullDestination = expect.objectContaining({
  latency: { average: { value: null, unit: null } },
});

describe('getUnitStats', () => {
  describe('components', () => {
    it.each([
      ['omitted', {}],
      ['an empty list', { components: [] }],
    ])(
      'answers for every component, keyed by kind and id, when components is %s',
      async (_n, req) => {
        const response = await run(makeSearch(), req);

        expect(Object.keys(response.components.destinations)).toEqual(['es-prod', 'es-dev', 'dbg']);
        expect(Object.keys(response.components.processors)).toEqual(['uppercase-message']);
        expect(streamsUnitStatsResponseSchema.parse(response)).toEqual(response);
      }
    );

    it('collapses duplicate components', async () => {
      const search = makeSearch();
      const ref = { kind: 'destination' as const, id: 'es-prod' };

      const response = await run(search, { components: [ref, ref] });

      expect(Object.keys(response.components.destinations)).toEqual(['es-prod']);
      const destinationSearch = search.mock.calls[1][0] as unknown as { query: unknown };
      expect(JSON.stringify(destinationSearch.query)).toContain(
        '"terms":{"attributes.streams.destination.id":["es-prod"]}'
      );
    });

    it('answers not_found and unsupported from the config without calling Elasticsearch', async () => {
      const search = makeSearch();

      const response = await run(search, {
        components: [
          { kind: 'destination', id: 'nope' },
          { kind: 'destination', id: 'dbg' },
          { kind: 'processor', id: 'nope' },
        ],
      });

      expect(search).not.toHaveBeenCalled();
      expect(response.components.destinations.nope.error?.code).toBe('not_found');
      expect(response.components.destinations.dbg.error?.code).toBe('unsupported');
      expect(response.components.processors.nope.error?.code).toBe('not_found');
      expect(response.error).toBeUndefined();
    });
  });

  describe('data', () => {
    it('maps a destination with data and leaves the rest null with no error', async () => {
      const response = await run(makeSearch());

      expect(response.components.destinations['es-prod'].events.incoming.total).toEqual({
        value: 30,
        unit: '{item}',
      });
      expect(response.components.destinations['es-dev']).toEqual(nullDestination);
      expect(response.components.destinations['es-dev'].error).toBeUndefined();
      expect(response.error).toBeUndefined();
    });

    it('reports the window, and a config hash only when the request pins one', async () => {
      const unpinned = await run(makeSearch());
      const pinned = await run(makeSearch(), { filter: { config_hash: 'h1' } });

      expect(unpinned.meta.config_hash).toBeUndefined();
      expect(unpinned.meta.window).toEqual({
        start: '2026-10-19T11:45:00.000Z',
        end: '2026-10-19T12:00:00.000Z',
      });
      expect(pinned.meta.config_hash).toBe('h1');
    });

    it('returns null values and no error for a pinned hash with no match', async () => {
      const response = await run(makeSearch({ earliestMs: null }), {
        filter: { config_hash: 'nope' },
      });

      expect(response.components.destinations['es-prod']).toEqual(nullDestination);
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
      expect(response.error).toBeUndefined();
    });
  });

  describe('rate denominator', () => {
    const rateOf = async (search: jest.Mock, request?: StreamsUnit.StatsRequest) =>
      (await run(search, request)).components.destinations['es-prod'].events.incoming.rate.value;

    // The fixture holds 30 items. The window is the 15 minutes before the fixed `now`.
    it('divides by the time since the config started when it started inside the window', async () => {
      // Data covers 5 minutes (300 s), not the 900 s window, so 30 / 300.
      expect(await rateOf(makeSearch({ earliestMs: now.getTime() - 5 * MINUTE }))).toBe(30 / 300);
    });

    it('divides by the whole window when the config is older than the window', async () => {
      // The config started an hour ago, so the window start wins: 900 s, so 30 / 900.
      expect(await rateOf(makeSearch({ earliestMs: now.getTime() - 60 * MINUTE }))).toBe(30 / 900);
    });

    it('does not shorten the denominator when no hash is pinned, whatever the config version', async () => {
      const search = makeSearch({ earliestMs: now.getTime() - 5 * MINUTE });

      await run(search);

      const earliestRequest = search.mock.calls[0][0] as unknown as { query: unknown };
      expect(JSON.stringify(earliestRequest.query)).not.toContain(CONFIG_HASH_FIELD);
    });

    it('limits the earliest start to the pinned hash', async () => {
      const search = makeSearch();

      await run(search, { filter: { config_hash: 'h1' } });

      const earliestRequest = search.mock.calls[0][0] as unknown as { query: unknown };
      expect(JSON.stringify(earliestRequest.query)).toContain(CONFIG_HASH_FIELD);
    });

    it('has a null rate when the first document is not before the window end', async () => {
      expect(await rateOf(makeSearch({ earliestMs: now.getTime() }))).toBeNull();
    });
  });

  describe('failures', () => {
    it.each([
      [403, 'forbidden'],
      [429, 'unavailable'],
      [503, 'unavailable'],
      [500, 'error'],
    ])('sets a response-level error for a %s in the shared lookup', async (status, code) => {
      const response = await run(
        makeSearch({
          earliest: () => {
            throw responseError(status);
          },
        })
      );

      expect(response.error?.code).toBe(code);
      expect(response.components.destinations['es-prod']).toEqual(nullDestination);
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
    });

    it('sets a response-level timeout error for a shared lookup timeout', async () => {
      const response = await run(
        makeSearch({
          earliest: () => {
            throw new errors.TimeoutError('timeout', {} as never);
          },
        })
      );

      expect(response.error?.code).toBe('timeout');
      expect(response.components.destinations['es-prod'].error).toBeUndefined();
    });

    it('treats a missing stream as no data, with no error at any level', async () => {
      const lookup = await run(
        makeSearch({
          earliest: () => {
            throw responseError(404);
          },
        })
      );
      const kind = await run(
        makeSearch({
          destination: () => {
            throw responseError(404);
          },
        })
      );

      for (const response of [lookup, kind]) {
        expect(response.error).toBeUndefined();
        expect(response.components.destinations['es-prod']).toEqual(nullDestination);
        expect(response.components.destinations['es-prod'].error).toBeUndefined();
      }
    });

    it('sets the same component error on every destination when the destination search fails', async () => {
      const response = await run(
        makeSearch({
          destination: () => {
            throw responseError(403);
          },
        })
      );

      expect(response.error).toBeUndefined();
      expect(response.components.destinations['es-prod'].error?.code).toBe('forbidden');
      expect(response.components.destinations['es-dev'].error?.code).toBe('forbidden');
      // Not queryable, so these keep their own error.
      expect(response.components.destinations.dbg.error?.code).toBe('unsupported');
      expect(response.components.processors['uppercase-message'].error).toBeUndefined();
    });
  });
});
