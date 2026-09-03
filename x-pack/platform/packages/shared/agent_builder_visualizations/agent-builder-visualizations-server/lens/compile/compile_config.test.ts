/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { compileConfig, isCompileSuccess } from './compile_config';
import { schemaForConfig } from './chart_schemas';
import { stripPanelLevelKeys } from '../panel_level';
import type { ProbedColumn } from '../probe_columns';
import type { ChartIntent } from '../intent';

const builder = new LensConfigBuilder(undefined, true);

const probed = (...columns: Array<[string, string]>): ProbedColumn[] =>
  columns.map(([name, type]) => ({ name, type }));

const assertRoundTrip = (config: Record<string, unknown>): void => {
  const { config: lens } = stripPanelLevelKeys(config);
  const parsed = schemaForConfig(lens)?.safeParse(lens);
  expect(parsed?.success).toBe(true);
  expect(() => builder.fromAPIFormat(lens as LensApiConfig)).not.toThrow();
};

describe('compileConfig', () => {
  it('compiles a metric and hides the chrome title', () => {
    const result = compileConfig({
      chartType: SupportedChartType.Metric,
      query: 'FROM logs | STATS count = COUNT(*)',
      columns: probed(['count', 'long']),
      mode: 'new',
      title: 'Total requests',
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    expect(result.panelLevel.hide_title).toBe(true);
    expect(result.config.hide_title).toBe(true);
    expect(result.config.metrics).toEqual([
      { type: 'primary', column: 'count', label: 'Total requests' },
    ]);
    assertRoundTrip(result.config);
  });

  it('compiles xy with house-style legend and axis defaults', () => {
    const result = compileConfig({
      chartType: SupportedChartType.XY,
      query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
      columns: probed(['count', 'long'], ['@timestamp', 'date']),
      mode: 'new',
      title: 'Requests',
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    expect(result.config.legend).toMatchObject({
      visibility: 'auto',
      placement: 'outside',
      position: 'bottom',
    });
    expect(result.config.axis).toMatchObject({
      x: { scale: 'temporal', title: { visible: false } },
    });
    expect(result.config.layers).toEqual([
      {
        type: 'line',
        x: { column: '@timestamp' },
        y: [{ column: 'count' }],
        data_source: {
          type: 'esql',
          query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
        },
      },
    ]);
    assertRoundTrip(result.config);
  });

  it('does not apply all-tier house style in edit mode', () => {
    const result = compileConfig({
      chartType: SupportedChartType.XY,
      query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
      columns: probed(['count', 'long'], ['@timestamp', 'date']),
      mode: 'edit',
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    expect(result.config.legend).toMatchObject({ visibility: 'auto' });
    expect((result.config.legend as { placement?: string }).placement).toBeUndefined();
    expect(
      (result.config.axis as { x?: { title?: { visible?: boolean } } }).x?.title?.visible
    ).toBeUndefined();
  });

  it('applies intent after house style so legend statistics stay visible', () => {
    const intent: ChartIntent = { legend_statistics: ['avg', 'max'] };
    const result = compileConfig({
      chartType: SupportedChartType.XY,
      query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
      columns: probed(['count', 'long'], ['@timestamp', 'date']),
      mode: 'new',
      intent,
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    expect(result.config.legend).toMatchObject({
      statistics: ['avg', 'max'],
      visibility: 'visible',
      placement: 'outside',
      position: 'bottom',
    });
    assertRoundTrip(result.config);
  });

  it('keeps an explicit style override after house style', () => {
    const result = compileConfig({
      chartType: SupportedChartType.XY,
      query: 'FROM logs | STATS count = COUNT(*) BY host',
      columns: probed(['count', 'long'], ['host', 'keyword']),
      mode: 'new',
      styleOverrides: { legend: { placement: 'inside', position: 'top_right' } },
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    expect(result.config.legend).toMatchObject({
      placement: 'inside',
      position: 'top_right',
    });
    assertRoundTrip(result.config);
  });

  it('compiles remaining chart types from hand fixtures', () => {
    const cases: Array<{
      chartType: SupportedChartType;
      query: string;
      columns: ProbedColumn[];
      intent?: ChartIntent;
    }> = [
      {
        chartType: SupportedChartType.Gauge,
        query: 'FROM logs | STATS score = AVG(cpu)',
        columns: probed(['score', 'double']),
      },
      {
        chartType: SupportedChartType.Heatmap,
        query: 'FROM logs | STATS count = COUNT(*) BY @timestamp, host',
        columns: probed(['count', 'long'], ['@timestamp', 'date'], ['host', 'keyword']),
      },
      {
        chartType: SupportedChartType.Tagcloud,
        query: 'FROM logs | STATS count = COUNT(*) BY host',
        columns: probed(['count', 'long'], ['host', 'keyword']),
      },
      {
        chartType: SupportedChartType.RegionMap,
        query: 'FROM logs | STATS count = COUNT(*) BY geo.src',
        columns: probed(['count', 'long'], ['geo.src', 'keyword']),
      },
      {
        chartType: SupportedChartType.Datatable,
        query: 'FROM logs | STATS count = COUNT(*) BY host',
        columns: probed(['count', 'long'], ['host', 'keyword']),
        intent: { table: { summary: 'sum', sort_by: 'count' } },
      },
      {
        chartType: SupportedChartType.Pie,
        query: 'FROM logs | STATS count = COUNT(*) BY host',
        columns: probed(['count', 'long'], ['host', 'keyword']),
      },
      {
        chartType: SupportedChartType.Treemap,
        query: 'FROM logs | STATS count = COUNT(*) BY host, service',
        columns: probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword']),
      },
      {
        chartType: SupportedChartType.Waffle,
        query: 'FROM logs | STATS count = COUNT(*) BY host',
        columns: probed(['count', 'long'], ['host', 'keyword']),
      },
      {
        chartType: SupportedChartType.Mosaic,
        query: 'FROM logs | STATS count = COUNT(*) BY host, service',
        columns: probed(['count', 'long'], ['host', 'keyword'], ['service', 'keyword']),
      },
    ];

    for (const fixture of cases) {
      const result = compileConfig({ ...fixture, mode: 'new', title: fixture.chartType });
      expect(isCompileSuccess(result)).toBe(true);
      if (isCompileSuccess(result)) {
        assertRoundTrip(result.config);
      }
    }
  });

  it('compiles a metric sparkline and secondary compare from intent', () => {
    const result = compileConfig({
      chartType: SupportedChartType.Metric,
      query: 'FROM logs | STATS count = COUNT(*), prev = COUNT(*)',
      columns: probed(['count', 'long'], ['prev', 'long']),
      mode: 'new',
      intent: {
        sparkline: true,
        secondary: { column: 'prev', compare: 'previous' },
      },
    });
    expect(isCompileSuccess(result)).toBe(true);
    if (!isCompileSuccess(result)) {
      return;
    }
    const metrics = result.config.metrics as Array<Record<string, unknown>>;
    expect(metrics[0]).toMatchObject({
      type: 'primary',
      column: 'count',
      background_chart: { type: 'trend' },
    });
    expect(metrics[1]).toMatchObject({
      type: 'secondary',
      column: 'prev',
      compare: { to: 'primary' },
    });
    expect(result.config.styling).toMatchObject({
      secondary: { label: { visible: false } },
    });
    assertRoundTrip(result.config);
  });

  it('returns the binder error without emitting a config', () => {
    const result = compileConfig({
      chartType: SupportedChartType.Metric,
      query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
      columns: probed(['count', 'long'], ['@timestamp', 'date']),
      mode: 'new',
    });
    expect(result).toEqual({ error: 'unbucket the query or use xy' });
  });
});
