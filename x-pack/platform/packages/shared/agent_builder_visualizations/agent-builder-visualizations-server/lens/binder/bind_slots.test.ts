/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { bindSlots, isBindAmbiguous, isBindError, isBindOk } from './bind_slots';
import type { ProbedColumn } from '../probe_columns';

const probed = (...columns: Array<[string, string]>): ProbedColumn[] =>
  columns.map(([name, type]) => ({ name, type }));

const STATS = 'FROM logs | STATS count = COUNT(*)';
const STATS_TWO = 'FROM logs | STATS count = COUNT(*), bytes = SUM(size)';
const BY_HOST = `${STATS} BY host`;
const BY_TIME = `${STATS} BY @timestamp`;
const BY_HOST_TIME = `${STATS} BY host, @timestamp`;
const BY_TWO_CATS = `${STATS} BY host, service`;
const BY_THREE_CATS = `${STATS} BY host, service, env`;
const BY_FOUR_CATS = `${STATS} BY host, service, env, region`;

describe('bindSlots', () => {
  it('binds a metric primary and a single breakdown', () => {
    const result = bindSlots(
      SupportedChartType.Metric,
      BY_HOST,
      probed(['count', 'long'], ['host', 'keyword'])
    );
    expect(result).toMatchObject({
      bindings: { primary: 'count', breakdown: 'host' },
    });
  });

  it('returns ambiguous secondary when a metric has two measures and no hint', () => {
    const result = bindSlots(
      SupportedChartType.Metric,
      STATS_TWO,
      probed(['count', 'long'], ['bytes', 'long'])
    );
    expect(isBindAmbiguous(result) && result.ambiguous).toBe('secondary');
    expect(isBindAmbiguous(result) && result.candidates).toEqual(['bytes']);
  });

  it('binds a metric secondary from intent', () => {
    const result = bindSlots(
      SupportedChartType.Metric,
      STATS_TWO,
      probed(['count', 'long'], ['bytes', 'long']),
      { secondary: { column: 'bytes' } }
    );
    expect(result).toMatchObject({
      bindings: { primary: 'count', secondary: 'bytes' },
    });
  });

  it('errors when a metric has a temporal dimension', () => {
    const result = bindSlots(
      SupportedChartType.Metric,
      BY_TIME,
      probed(['count', 'long'], ['@timestamp', 'date'])
    );
    expect(isBindError(result)).toBe(true);
  });

  it('binds a gauge primary and gauge columns from intent', () => {
    const result = bindSlots(
      SupportedChartType.Gauge,
      'FROM logs | STATS score = AVG(cpu), low = MIN(cpu), high = MAX(cpu), target = AVG(goal)',
      probed(['score', 'double'], ['low', 'double'], ['high', 'double'], ['target', 'double']),
      { gauge: { min: 'low', max: 'high', goal: 'target' } }
    );
    expect(result).toMatchObject({
      bindings: {
        primary: 'score',
        gaugeMin: 'low',
        gaugeMax: 'high',
        gaugeGoal: 'target',
      },
    });
  });

  it('binds xy x from the first temporal dimension and y from all measures', () => {
    const result = bindSlots(
      SupportedChartType.XY,
      BY_HOST_TIME,
      probed(['count', 'long'], ['host', 'keyword'], ['@timestamp', 'date'])
    );
    expect(isBindOk(result) && result.bindings).toMatchObject({
      x: '@timestamp',
      y: ['count'],
      breakdown: 'host',
      layerType: 'line',
      xScale: 'temporal',
    });
  });

  it('uses a bar layer for categorical x and stacks when there is a breakdown', () => {
    const result = bindSlots(
      SupportedChartType.XY,
      BY_TWO_CATS,
      probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword'])
    );
    expect(isBindOk(result) && result.bindings).toMatchObject({
      x: 'host',
      breakdown: 'service',
      layerType: 'bar_stacked',
      xScale: 'ordinal',
    });
  });

  it('returns ambiguous breakdown when xy has two leftover dimensions', () => {
    const result = bindSlots(
      SupportedChartType.XY,
      BY_THREE_CATS,
      probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword'], ['env', 'keyword'])
    );
    expect(isBindAmbiguous(result) && result.ambiguous).toBe('breakdown');
  });

  it('honors xy intent hints', () => {
    const result = bindSlots(
      SupportedChartType.XY,
      BY_TWO_CATS,
      probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword']),
      { x_field: 'service', breakdown_field: 'host', series_type: 'area' }
    );
    expect(isBindOk(result) && result.bindings).toMatchObject({
      x: 'service',
      breakdown: 'host',
      layerType: 'area',
    });
  });

  it('returns ambiguous heatmap x when two numeric dimensions are unhinted', () => {
    const result = bindSlots(
      SupportedChartType.Heatmap,
      'FROM logs | STATS count = COUNT(*) BY x, y',
      probed(['count', 'long'], ['x', 'double'], ['y', 'double'])
    );
    expect(isBindAmbiguous(result) && result.ambiguous).toBe('x');
  });

  it('binds heatmap x from the first temporal dimension', () => {
    const result = bindSlots(
      SupportedChartType.Heatmap,
      'FROM logs | STATS count = COUNT(*) BY @timestamp, host',
      probed(['count', 'long'], ['@timestamp', 'date'], ['host', 'keyword'])
    );
    expect(isBindOk(result) && result.bindings).toMatchObject({
      primary: 'count',
      x: '@timestamp',
      yDim: 'host',
      xScale: 'temporal',
    });
  });

  it('binds tag_cloud with exactly one categorical dimension', () => {
    const result = bindSlots(
      SupportedChartType.Tagcloud,
      BY_HOST,
      probed(['count', 'long'], ['host', 'keyword'])
    );
    expect(result).toMatchObject({
      bindings: { primary: 'count', tagBy: 'host' },
    });
  });

  it('errors when tag_cloud has a non-categorical dimension', () => {
    const result = bindSlots(
      SupportedChartType.Tagcloud,
      BY_TIME,
      probed(['count', 'long'], ['@timestamp', 'date'])
    );
    expect(isBindError(result)).toBe(true);
  });

  it('binds region_map ems from a country iso code column', () => {
    const result = bindSlots(
      SupportedChartType.RegionMap,
      'FROM logs | STATS count = COUNT(*) BY geo.src',
      probed(['count', 'long'], ['geo.src', 'keyword'])
    );
    expect(result).toMatchObject({
      bindings: {
        primary: 'count',
        region: 'geo.src',
        ems: { boundaries: 'world_countries', join: 'iso2' },
      },
    });
  });

  it('returns ambiguous ems when the region column has no mapping', () => {
    const result = bindSlots(
      SupportedChartType.RegionMap,
      BY_HOST,
      probed(['count', 'long'], ['host', 'keyword'])
    );
    expect(isBindAmbiguous(result) && result.ambiguous).toBe('ems');
  });

  it('binds data_table numeric columns as metrics and the rest as rows', () => {
    const result = bindSlots(
      SupportedChartType.Datatable,
      'FROM logs | STATS count = COUNT(*) BY host',
      probed(['count', 'long'], ['host', 'keyword'])
    );
    expect(result).toMatchObject({
      bindings: { metrics: ['count'], rows: ['host'] },
    });
  });

  it('hides data_table columns from intent', () => {
    const result = bindSlots(
      SupportedChartType.Datatable,
      BY_HOST,
      probed(['count', 'long'], ['host', 'keyword']),
      { table: { hidden: ['host'] } }
    );
    expect(result).toMatchObject({
      bindings: { metrics: ['count'], rows: [] },
    });
  });

  it('caps pie group_by at three categorical dimensions', () => {
    const result = bindSlots(
      SupportedChartType.Pie,
      BY_THREE_CATS,
      probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword'], ['env', 'keyword'])
    );
    expect(isBindOk(result) && result.bindings.groupBy).toEqual(['host', 'service', 'env']);
  });

  it('returns ambiguous collapse when pie has more than three dimensions', () => {
    const result = bindSlots(
      SupportedChartType.Pie,
      BY_FOUR_CATS,
      probed(
        ['count', 'long'],
        ['host', 'keyword'],
        ['service', 'keyword'],
        ['env', 'keyword'],
        ['region', 'keyword']
      )
    );
    expect(isBindAmbiguous(result) && result.ambiguous).toBe('collapse');
  });

  it('errors when a partition chart has a temporal dimension', () => {
    const result = bindSlots(
      SupportedChartType.Pie,
      BY_TIME,
      probed(['count', 'long'], ['@timestamp', 'date'])
    );
    expect(isBindError(result)).toBe(true);
  });

  it('binds mosaic with exactly two dimensions', () => {
    const result = bindSlots(
      SupportedChartType.Mosaic,
      BY_TWO_CATS,
      probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword'])
    );
    expect(result).toMatchObject({
      bindings: { primary: 'count', groupBy: ['host'], groupBreakdownBy: ['service'] },
    });
  });

  it('errors when mosaic does not have two dimensions', () => {
    const result = bindSlots(
      SupportedChartType.Mosaic,
      BY_HOST,
      probed(['count', 'long'], ['host', 'keyword'])
    );
    expect(isBindError(result)).toBe(true);
  });
});
