/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONFIG_HASH_FIELD,
  OUTCOME_FIELD,
  STEP_ID_FIELD,
  UNIT_ID_FIELD,
  UNIT_STATS_STREAM,
} from '../constants';
import { buildProcessorStatsRequest } from './build_processor_stats_request';

const window = { start: '2026-10-19T11:45:00.000Z', end: '2026-10-19T12:00:00.000Z' };
const params = { unitId: 'default', window, ids: ['uppercase-message'] };

interface ProcessorAggs {
  by_id: {
    terms: { size: number };
    aggs: {
      items_in: { filter: unknown; aggs: { sum?: unknown; failures?: { filter: unknown } } };
      duration: { aggs: Record<string, unknown> };
    };
  };
}

const getAggs = (request: ReturnType<typeof buildProcessorStatsRequest>) =>
  request.aggs as unknown as ProcessorAggs;

describe('buildProcessorStatsRequest', () => {
  it('searches the exact stream with no hits and filters on unit, window and ids', () => {
    const request = buildProcessorStatsRequest(params);

    expect(request.index).toBe(UNIT_STATS_STREAM);
    expect(request.size).toBe(0);
    expect(request.query?.bool?.filter).toEqual([
      { term: { [UNIT_ID_FIELD]: 'default' } },
      { range: { '@timestamp': { gte: window.start, lt: window.end } } },
      { terms: { [STEP_ID_FIELD]: ['uppercase-message'] } },
    ]);
  });

  it('adds a hash filter only when the request pins one', () => {
    const pinned = buildProcessorStatsRequest({ ...params, configHash: 'h1' });

    expect(pinned.query?.bool?.filter).toContainEqual({ term: { [CONFIG_HASH_FIELD]: 'h1' } });
  });

  it('sizes the terms aggregation to the requested ids', () => {
    expect(getAggs(buildProcessorStatsRequest(params)).by_id.terms.size).toBe(1);
  });

  it('counts incoming items by direction in, with no outcome filter and no pipeline filter', () => {
    const { items_in: itemsIn } = getAggs(buildProcessorStatsRequest(params)).by_id.aggs;

    expect(itemsIn.filter).toEqual({
      bool: {
        filter: [
          { exists: { field: 'metrics.streams.step.items' } },
          { term: { 'attributes.direction': 'in' } },
        ],
      },
    });
    expect(JSON.stringify(buildProcessorStatsRequest(params))).not.toContain('pipeline');
  });

  it('does not query failures yet', () => {
    const { items_in: itemsIn } = getAggs(buildProcessorStatsRequest(params)).by_id.aggs;

    expect(Object.keys(itemsIn.aggs)).toEqual(['sum']);
  });

  it.skip('counts failures as outcome failure only, so refused is not counted', () => {
    const { items_in: itemsIn } = getAggs(buildProcessorStatsRequest(params)).by_id.aggs;

    expect(itemsIn.aggs.failures?.filter).toEqual({ term: { [OUTCOME_FIELD]: 'failure' } });
  });

  it('sums the duration, so the mapper can divide by items for a per event average', () => {
    const { duration } = getAggs(buildProcessorStatsRequest(params)).by_id.aggs;

    expect(Object.keys(duration.aggs)).toEqual(['sum']);
  });
});
