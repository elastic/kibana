/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitStatsSourceResultSchema } from '@kbn/streams-schema';
import { mapSourceStatsRows, noSourceStats } from './map_source_stats_result';

describe('mapSourceStatsRows', () => {
  const row = { id: 'otlp-input', accepted_rate: 1.2 };

  it('places a row into the accepted rate of the source, with units', () => {
    const result = mapSourceStatsRows({ rows: [row] })['otlp-input'];

    expect(result).toEqual({
      events: { accepted: { rate: { value: 1.2, unit: '{item}', time_unit: 's' } } },
    });
    expect(streamsUnitStatsSourceResultSchema.parse(result)).toEqual(result);
  });

  it('has a result for every source with a row, and none for a source without one', () => {
    const rows = [row, { id: 'prw-input', accepted_rate: 0.4 }];

    const results = mapSourceStatsRows({ rows });

    expect(Object.keys(results)).toEqual(['otlp-input', 'prw-input']);
    expect(results['prw-input'].events.accepted.rate.value).toBe(0.4);
    expect(results.other).toBeUndefined();
  });

  it('keeps a rate of 0, which is a source that only had refused or failed items', () => {
    const result = mapSourceStatsRows({ rows: [{ ...row, accepted_rate: 0 }] })['otlp-input'];

    expect(result.events.accepted.rate.value).toBe(0);
  });

  it('leaves a rate that ES|QL returned as null as no data', () => {
    const result = mapSourceStatsRows({ rows: [{ ...row, accepted_rate: null }] })['otlp-input'];

    expect(result).toEqual(noSourceStats());
  });
});
