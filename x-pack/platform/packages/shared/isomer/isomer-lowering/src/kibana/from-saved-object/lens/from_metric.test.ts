/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensMetric from '../../__fixtures__/lens_metric.json';
import lensMetricTrendlineSibling from '../../__fixtures__/lens_metric_trendline_sibling.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (Metric)', () => {
  it('lowers an lnsMetric saved object to an AdaptiveLens with chart.kind = "metric"', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensMetric, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });

    expect(lens).toBeDefined();
    expect(lens?.id).toBe('lens-metric-total-orders');
    expect(lens?.chart.kind).toBe('metric');

    if (lens?.chart.kind === 'metric') {
      expect(lens.chart.primary.id).toBe('col-count');
      expect(lens.chart.primary.label).toBe('Order count');
      expect(lens.chart.secondary).toBeUndefined();
      expect(lens.chart.trend).toBeUndefined();
    }

    // Should synthesize a STATS COUNT(*) query.
    expect(lens?.query.esql).toContain('FROM `orders-*`');
    expect(lens?.query.esql).toContain('COUNT(*)');

    expect(diagnostics.find((d) => d.code === 'lens.formBased.lowered-to-esql')).toBeDefined();
  });

  it('resolves a sibling-layer trendline into chart.trend with a helpful diagnostic', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensMetricTrendlineSibling, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('metric');
    if (lens?.chart.kind === 'metric') {
      // The sibling layer's first non-bucketed column carries the metric.
      // `col-trend-time` is the date_histogram bucket, so the resolver
      // must skip it and pick `col-trend-count`.
      expect(lens.chart.trend).toBeDefined();
      expect(lens.chart.trend?.id).toBe('col-trend-count');
      expect(lens.chart.trend?.label).toBe('Hourly orders');
      expect(lens.chart.trend?.query?.esql).toContain(
        'STATS `col-trend-count` = COUNT(*) BY `col-trend-time` = BUCKET(`@timestamp`, 1h)'
      );
    }

    expect(
      diagnostics.find((d) => d.code === 'lens.metric.trendline-from-sibling-layer')
    ).toBeDefined();
    // The "deferred to host" message disappears now that we resolve.
    expect(
      diagnostics.find((d) => d.code === 'lens.metric.trendline-deferred-to-host')
    ).toBeUndefined();
  });

  it('lifts metric color palette stops into value tone rules', () => {
    const patched = JSON.parse(JSON.stringify(lensMetric));
    patched.attributes.state.visualization.colorMode = 'Labels';
    patched.attributes.state.visualization.palette = {
      params: {
        stops: [
          { stop: 0, color: '#54b399' },
          { stop: 500, color: '#d6bf57' },
          { stop: 1000, color: '#e7664c' },
        ],
      },
    };

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('metric');
    if (lens?.chart.kind === 'metric') {
      expect(lens.chart.primary.colorRules).toEqual([
        { at: 0, tone: 'success' },
        { at: 500, tone: 'warning' },
        { at: 1000, tone: 'danger' },
      ]);
    }
  });

  const textBasedMetric = (esql: string, column: Record<string, unknown>) => ({
    id: 'lens-metric-textbased',
    type: 'lens',
    attributes: {
      title: 'Metric',
      visualizationType: 'lnsMetric',
      state: {
        datasourceStates: {
          textBased: {
            layers: {
              'layer-1': {
                index: 'idx',
                query: { esql },
                columns: [column],
                timeField: '@timestamp',
              },
            },
          },
        },
        visualization: {
          layerId: 'layer-1',
          layerType: 'data',
          metricAccessor: column['columnId'],
        },
      },
    },
  });

  it('labels an ES|QL (textBased) metric from its column and injects the dashboard time range', () => {
    const { lens } = fromKibanaSavedObject(
      textBasedMetric(
        'FROM kibana_sample_data_logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`',
        { columnId: 'Visits', fieldName: 'Visits', meta: { type: 'number' } }
      ),
      { timeRange: { from: 'now-7d/d', to: 'now' } }
    );

    expect(lens?.chart.kind).toBe('metric');
    if (lens?.chart.kind === 'metric') {
      // Label comes from the textBased column, not the junk lens title "Metric".
      expect(lens.chart.primary.label).toBe('Visits');
      expect(lens.chart.primary.id).toBe('Visits');
    }
    // Datemath rounding (`now-7d/d`) lowers to DATE_TRUNC and the filter is
    // injected right after the FROM source command.
    expect(lens?.query.esql).toMatch(
      /FROM kibana_sample_data_logs \| WHERE `@timestamp` >= DATE_TRUNC\(1 day, NOW\(\) - 7 day\) AND `@timestamp` <= NOW\(\) \| STATS/
    );
  });

  it('carries an ES|QL metric column percent format onto the lens', () => {
    const { lens } = fromKibanaSavedObject(
      textBasedMetric(
        'FROM kibana_sample_data_logs | STATS p = AVG(x) | RENAME p as `HTTP 5xx (%)`',
        {
          columnId: 'HTTP 5xx (%)',
          fieldName: 'HTTP 5xx (%)',
          meta: { type: 'number' },
          params: { format: { id: 'percent', params: { decimals: 2 } } },
        }
      )
    );

    expect(lens?.format).toEqual({ kind: 'percent', precision: 2 });
  });

  it('preserves metric maxAccessor for progress-style binding', () => {
    const patched = JSON.parse(JSON.stringify(lensMetric));
    patched.attributes.state.visualization.maxAccessor = 'col-max';
    patched.attributes.state.datasourceStates.formBased.layers['layer-1'].columns['col-max'] = {
      operationType: 'count',
      customLabel: true,
      label: 'Order goal',
      dataType: 'number',
      isBucketed: false,
    };
    patched.attributes.state.datasourceStates.formBased.layers['layer-1'].columnOrder.push(
      'col-max'
    );

    const { lens } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('metric');
    if (lens?.chart.kind === 'metric') {
      expect(lens.chart.max).toEqual({
        id: 'col-max',
        label: 'Order goal',
      });
    }
  });

  it('lowers Lens state.filters into the synthesized WHERE', () => {
    const filtered = JSON.parse(JSON.stringify(lensMetric));
    filtered.attributes.state.filters = [
      {
        meta: {
          type: 'phrase',
          field: 'reporter.type',
          params: { query: 'ftr' },
        },
      },
    ];
    const { lens } = fromKibanaSavedObject(filtered, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });
    expect(lens?.query.esql).toContain('`reporter.type` == "ftr"');
  });

  it('carries a duration format on the secondary metric', () => {
    const withDuration = JSON.parse(JSON.stringify(lensMetric));
    withDuration.attributes.state.visualization.secondaryMetricAccessor = 'col-duration';
    withDuration.attributes.state.datasourceStates.formBased.layers['layer-1'].columns[
      'col-duration'
    ] = {
      operationType: 'sum',
      sourceField: 'test.duration',
      isBucketed: false,
      dataType: 'number',
      customLabel: true,
      label: 'duration',
      params: {
        format: {
          id: 'duration',
          params: { decimals: 1, fromUnit: 'milliseconds' },
        },
      },
    };
    withDuration.attributes.state.datasourceStates.formBased.layers['layer-1'].columnOrder.push(
      'col-duration'
    );

    const { lens } = fromKibanaSavedObject(withDuration, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'orders-*' : undefined,
    });
    expect(lens?.chart.kind).toBe('metric');
    if (lens?.chart.kind === 'metric') {
      expect(lens.chart.secondary?.label).toBe('duration');
      expect(lens.chart.secondary?.format).toEqual({
        kind: 'duration',
        precision: 1,
      });
    }
  });
});
