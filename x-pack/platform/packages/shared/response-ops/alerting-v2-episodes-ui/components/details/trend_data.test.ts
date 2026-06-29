/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator } from '@kbn/alerting-v2-rule-form';
import type { EpisodeTrendRow } from '../../queries/episode_trend_query';
import { mapEventDataToSeries, deriveTrendThresholds } from './trend_data';

describe('mapEventDataToSeries', () => {
  it('builds one series per label, reading values from each event metrics', () => {
    const rows = [
      { '@timestamp': '2026-06-18T00:00:00.000Z', metrics: { count: 10, error_rate: 1.5 } },
      { '@timestamp': '2026-06-18T01:00:00.000Z', metrics: { count: 20, error_rate: 2.5 } },
    ];
    const series = mapEventDataToSeries(rows, ['count', 'error_rate']);
    expect(series).toHaveLength(2);
    const count = series.find((s) => s.label === 'count')!;
    expect(count.points).toEqual([
      { x: Date.parse('2026-06-18T00:00:00.000Z'), y: 10 },
      { x: Date.parse('2026-06-18T01:00:00.000Z'), y: 20 },
    ]);
  });

  it('yields a null point when the event has no value for the label (e.g. empty data)', () => {
    const rows: Array<Pick<EpisodeTrendRow, '@timestamp' | 'metrics'>> = [
      { '@timestamp': '2026-06-18T00:00:00.000Z', metrics: { count: 10 } },
      { '@timestamp': '2026-06-18T01:00:00.000Z', metrics: { count: null } },
      { '@timestamp': '2026-06-18T02:00:00.000Z', metrics: {} },
    ];
    const [count] = mapEventDataToSeries(rows, ['count']);
    expect(count.points).toEqual([
      { x: Date.parse('2026-06-18T00:00:00.000Z'), y: 10 },
      { x: Date.parse('2026-06-18T01:00:00.000Z'), y: null },
      { x: Date.parse('2026-06-18T02:00:00.000Z'), y: null },
    ]);
  });

  it('skips rows with unparseable timestamps', () => {
    const rows = [
      { '@timestamp': 'not-a-date', metrics: { count: 10 } },
      { '@timestamp': '2026-06-18T01:00:00.000Z', metrics: { count: 20 } },
    ];
    const [count] = mapEventDataToSeries(rows, ['count']);
    expect(count.points).toEqual([{ x: Date.parse('2026-06-18T01:00:00.000Z'), y: 20 }]);
  });
});

describe('deriveTrendThresholds', () => {
  it('builds a single-value labelled threshold for comparison operators', () => {
    const result = deriveTrendThresholds([
      { id: 'c1', metric: 'count', comparator: Comparator.GT, threshold: [100] },
    ]);
    expect(result).toEqual([{ id: 'c1', metric: 'count', label: 'count > 100', values: [100] }]);
  });

  it('builds two-value labels for BETWEEN and NOT_BETWEEN', () => {
    const [between] = deriveTrendThresholds([
      { id: 'c1', metric: 'lat', comparator: Comparator.BETWEEN, threshold: [10, 20] },
    ]);
    expect(between).toEqual({
      id: 'c1',
      metric: 'lat',
      label: 'lat between 10 and 20',
      values: [10, 20],
    });

    const [notBetween] = deriveTrendThresholds([
      { id: 'c2', metric: 'lat', comparator: Comparator.NOT_BETWEEN, threshold: [10, 20] },
    ]);
    expect(notBetween.label).toBe('lat not between 10 and 20');
    expect(notBetween.values).toEqual([10, 20]);
  });

  it('skips conditions without a metric or threshold', () => {
    expect(
      deriveTrendThresholds([
        { id: 'c1', metric: '', comparator: Comparator.GT, threshold: [1] },
        { id: 'c2', metric: 'x', comparator: Comparator.GT, threshold: [] },
      ])
    ).toEqual([]);
  });
});
