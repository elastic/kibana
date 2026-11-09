/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { scoreQuery, substituteBindParams } from './scorers';
import type { EsqlResult } from './scorers';

const esClientReturning = (result: EsqlResult | Error): EsClient =>
  ({
    esql: {
      query: async () => {
        if (result instanceof Error) throw result;
        return result;
      },
    },
  } as unknown as EsClient);

const gold: EsqlResult = {
  columns: [
    { name: 'p95', type: 'double' },
    { name: 'median', type: 'double' },
    { name: 'OriginWeather', type: 'keyword' },
  ],
  values: [
    [5000, 2000, 'Sunny'],
    [4900, 1900, 'Rain'],
  ],
};

describe('scoreQuery result equivalence', () => {
  it('ignores column order and column names', async () => {
    // What `KEEP OriginWeather, p95, median` produces: same data, different column order.
    const candidate: EsqlResult = {
      columns: [
        { name: 'OriginWeather', type: 'keyword' },
        { name: 'p95_distance', type: 'double' },
        { name: 'median_distance', type: 'double' },
      ],
      values: [
        ['Sunny', 5000, 2000],
        ['Rain', 4900, 1900],
      ],
    };

    const score = await scoreQuery({
      esClient: esClientReturning(candidate),
      query: 'FROM a | STATS x = COUNT(*)',
      goldRows: gold,
    });

    expect(score.resultEquivalence).toBe(1);
    expect(score.columnsAligned).toBe(true);
    expect(score.reward).toBeCloseTo(1, 10);
  });

  it('ignores row order', async () => {
    const candidate: EsqlResult = {
      ...gold,
      values: [...(gold.values ?? [])].reverse(),
    };
    const score = await scoreQuery({
      esClient: esClientReturning(candidate),
      query: 'FROM a | STATS x = COUNT(*)',
      goldRows: gold,
    });
    expect(score.resultEquivalence).toBe(1);
  });

  it('still rewards a candidate that returns the gold columns plus extras', async () => {
    const candidate: EsqlResult = {
      columns: [...(gold.columns ?? []), { name: 'extra', type: 'long' }],
      values: [
        [5000, 2000, 'Sunny', 1],
        [4900, 1900, 'Rain', 2],
      ],
    };
    const score = await scoreQuery({
      esClient: esClientReturning(candidate),
      query: 'FROM a',
      goldRows: gold,
    });
    expect(score.resultEquivalence).toBe(1);
    expect(score.extraColumns).toBe(1);
  });

  it('penalises wrong values rather than wrong shape', async () => {
    const candidate: EsqlResult = {
      ...gold,
      values: [
        [5000, 2000, 'Sunny'],
        [1, 1, 'Fog'],
      ],
    };
    const score = await scoreQuery({
      esClient: esClientReturning(candidate),
      query: 'FROM a',
      goldRows: gold,
    });
    expect(score.resultEquivalence).toBeCloseTo(1 / 3, 5);
  });

  it('scores a non-executing query without crediting equivalence', async () => {
    const score = await scoreQuery({
      esClient: esClientReturning(new Error('verification_exception')),
      query: 'FROM a | WHERE missing > 1',
      goldRows: gold,
    });
    expect(score.executes).toBe(false);
    expect(score.resultEquivalence).toBe(0);
  });

  it('renormalises the reward when the gold query itself does not execute', async () => {
    const score = await scoreQuery({
      esClient: esClientReturning({ columns: [], values: [[1]] }),
      query: 'FROM a',
      goldRows: null,
    });
    expect(score.resultEquivalence).toBeNull();
    expect(score.reward).toBeCloseTo(1, 10);
  });

  it('substitutes the named time parameters', () => {
    expect(
      substituteBindParams('FROM a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend')
    ).toBe(
      'FROM a | WHERE @timestamp >= "2000-01-01T00:00:00.000Z" AND @timestamp < "2100-12-31T23:59:59.999Z"'
    );
  });
});
