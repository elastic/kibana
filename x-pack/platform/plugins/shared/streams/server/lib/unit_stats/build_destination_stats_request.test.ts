/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONFIG_HASH_FIELD,
  DESTINATION_ID_FIELD,
  OUTCOME_FIELD,
  UNIT_ID_FIELD,
  UNIT_STATS_STREAM,
} from './constants';
import { buildDestinationStatsRequest } from './build_destination_stats_request';

const window = { start: '2026-10-19T11:45:00.000Z', end: '2026-10-19T12:00:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'], bucketMs: 60_000 };

interface DestinationAggs {
  by_id: {
    terms: { size: number };
    aggs: {
      items: {
        filter: unknown;
        aggs: { series: { date_histogram: unknown }; failures: { filter: unknown } };
      };
    };
  };
}

const getAggs = (request: ReturnType<typeof buildDestinationStatsRequest>) =>
  request.aggs as unknown as DestinationAggs;

describe('buildDestinationStatsRequest', () => {
  it('searches the exact stream with no hits and filters on unit, window and ids', () => {
    const request = buildDestinationStatsRequest(params);

    expect(request.index).toBe(UNIT_STATS_STREAM);
    expect(request.size).toBe(0);
    expect(request.query?.bool?.filter).toEqual([
      { term: { [UNIT_ID_FIELD]: 'default' } },
      { range: { '@timestamp': { gte: window.start, lt: window.end } } },
      { terms: { [DESTINATION_ID_FIELD]: ['es-prod', 'es-dev'] } },
    ]);
  });

  it('adds a hash filter only when the request pins one', () => {
    const pinned = buildDestinationStatsRequest({ ...params, configHash: 'h1' });

    expect(pinned.query?.bool?.filter).toContainEqual({ term: { [CONFIG_HASH_FIELD]: 'h1' } });
  });

  it('sizes the terms aggregation to the requested ids and buckets the series', () => {
    const { by_id: byId } = getAggs(buildDestinationStatsRequest(params));

    expect(byId.terms.size).toBe(2);
    expect(byId.aggs.items.aggs.series.date_histogram).toEqual({
      field: '@timestamp',
      fixed_interval: '60000ms',
      min_doc_count: 1,
    });
  });

  it('does not filter incoming items by outcome', () => {
    const { items } = getAggs(buildDestinationStatsRequest(params)).by_id.aggs;

    expect(items.filter).toEqual({ exists: { field: 'metrics.streams.destination.items' } });
  });

  it('counts failures as every outcome except success', () => {
    const { items } = getAggs(buildDestinationStatsRequest(params)).by_id.aggs;

    expect(items.aggs.failures.filter).toEqual({
      bool: {
        filter: [{ exists: { field: OUTCOME_FIELD } }],
        must_not: [{ term: { [OUTCOME_FIELD]: 'success' } }],
      },
    });
  });
});
