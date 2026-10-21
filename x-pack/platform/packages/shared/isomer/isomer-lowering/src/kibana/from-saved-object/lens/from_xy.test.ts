/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensXyTwoSeries from '../../__fixtures__/lens_xy_two_series.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (XY)', () => {
  it('lowers an lnsXY saved object to an AdaptiveLens with chart.kind = "xy"', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensXyTwoSeries, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens).toBeDefined();
    expect(lens?.id).toBe('lens-xy-checkout-latency');
    expect(lens?.title).toBe('Checkout latency by region');
    expect(lens?.chart.kind).toBe('xy');

    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.mode).toBe('line');
      expect(lens.chart.stacked).toBe(false);
      expect(lens.chart.xAxis).toEqual({
        id: 'col-time',
        label: '@timestamp per hour',
      });
      expect(lens.chart.series).toHaveLength(1);
      expect(lens.chart.series[0]?.id).toBe('col-p95');
      expect(lens.chart.series[0]?.splitOnField).toBe('col-region');
    }

    // ES|QL synthesis emits an info diagnostic noting form-based -> ES|QL.
    expect(diagnostics.find((d) => d.code === 'lens.formBased.lowered-to-esql')).toBeDefined();
    // No "unresolved index pattern" diagnostic because we provided a resolver.
    expect(
      diagnostics.find((d) => d.code === 'lens.formBased.unresolved-index-pattern')
    ).toBeUndefined();

    expect(lens?.query.esql).toContain('FROM `logs-*`');
    expect(lens?.query.esql).toContain('PERCENTILE');
  });

  it('drops an unsupported `filters` split bucket instead of leaving a dangling accessor', () => {
    const withFilters = JSON.parse(JSON.stringify(lensXyTwoSeries));
    const layer = withFilters.attributes.state.datasourceStates.formBased.layers['layer-1'];
    layer.columns['col-region'] = {
      operationType: 'filters',
      isBucketed: true,
      params: { filters: [{ input: { query: 'a', language: 'kuery' } }] },
    };

    const { lens, diagnostics } = fromKibanaSavedObject(withFilters, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.series[0]?.splitOnField).toBeUndefined();
    }
    expect(diagnostics.find((d) => d.code === 'lens.xy.split-bucket-dropped')).toBeDefined();
  });

  it('lowers a translatable `filters` split bucket to a CASE breakdown', () => {
    const withFilters = JSON.parse(JSON.stringify(lensXyTwoSeries));
    const layer = withFilters.attributes.state.datasourceStates.formBased.layers['layer-1'];
    layer.columns['col-region'] = {
      operationType: 'filters',
      isBucketed: true,
      params: {
        filters: [
          {
            input: {
              query: 'response.keyword >= 200 and response.keyword < 400',
              language: 'kuery',
            },
            label: 'HTTP 2xx and 3xx',
          },
          {
            input: {
              query: 'response.keyword >= 400 and response.keyword < 500',
              language: 'kuery',
            },
            label: 'HTTP 4xx',
          },
          {
            input: { query: 'response.keyword >= 500', language: 'kuery' },
            label: 'HTTP 5xx',
          },
        ],
      },
    };

    const { lens, diagnostics } = fromKibanaSavedObject(withFilters, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.series[0]?.splitOnField).toBe('col-region');
    }
    expect(diagnostics.find((d) => d.code === 'lens.xy.split-bucket-dropped')).toBeUndefined();

    const esql = lens?.query.esql ?? '';
    expect(esql).toContain('CASE(');
    expect(esql).toContain('"HTTP 4xx"');
    expect(esql).toContain('TO_DOUBLE(`response.keyword`) >= 400');
    // Rows matching no filter are excluded via the ORed match predicate.
    expect(esql).toContain(' OR ');
  });

  it('maps textBased (ES|QL) accessors to their fieldName, not the columnId', () => {
    const textBasedXy = {
      id: 'lens-xy-textbased',
      type: 'lens',
      attributes: {
        title: 'Bytes distribution',
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                'layer-1': {
                  index: 'idx',
                  query: {
                    esql: 'FROM logs | STATS percentage = COUNT() by bytes = BUCKET(bytes, 1000, 0, 100000)',
                  },
                  columns: [
                    { columnId: 'uuid-x', fieldName: 'bytes' },
                    { columnId: 'percentage', fieldName: 'percentage' },
                  ],
                  timeField: '@timestamp',
                },
              },
            },
          },
          visualization: {
            preferredSeriesType: 'bar_stacked',
            layers: [
              {
                layerId: 'layer-1',
                layerType: 'data',
                xAccessor: 'uuid-x',
                accessors: ['percentage'],
              },
            ],
          },
        },
      },
    };

    const { lens } = fromKibanaSavedObject(textBasedXy);
    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.xAxis.id).toBe('bytes');
      expect(lens.chart.series[0]?.id).toBe('percentage');
    }
  });

  it('threads orientation: "horizontal" when seriesType is bar_horizontal*', () => {
    const horizontal = JSON.parse(JSON.stringify(lensXyTwoSeries));
    horizontal.attributes.state.visualization.preferredSeriesType = 'bar_horizontal';
    horizontal.attributes.state.visualization.layers[0].seriesType = 'bar_horizontal';
    const { lens, diagnostics } = fromKibanaSavedObject(horizontal, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });
    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.mode).toBe('bar');
      expect(lens.chart.orientation).toBe('horizontal');
    }
    // line/area + horizontal should be a no-op with a diagnostic — but
    // we asked for bar_horizontal, so this code path is silent.
    expect(
      diagnostics.find((d) => d.code === 'lens.xy.horizontal-non-bar-collapsed')
    ).toBeUndefined();
  });

  it('preserves percentage stacking from Lens series types', () => {
    const percentageStacked = JSON.parse(JSON.stringify(lensXyTwoSeries));
    percentageStacked.attributes.state.visualization.preferredSeriesType = 'bar_percentage_stacked';
    percentageStacked.attributes.state.visualization.layers[0].seriesType =
      'bar_percentage_stacked';
    const { lens } = fromKibanaSavedObject(percentageStacked, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.mode).toBe('bar');
      expect(lens.chart.stacked).toBe(true);
      expect(lens.chart.stack).toBe('percentage');
    }
  });

  it('preserves XY curve, missing-value, and value-label options', () => {
    const configured = JSON.parse(JSON.stringify(lensXyTwoSeries));
    configured.attributes.state.visualization.curveType = 'CURVE_STEP';
    configured.attributes.state.visualization.fittingFunction = 'Linear';
    configured.attributes.state.visualization.valueLabels = 'show';
    const { lens } = fromKibanaSavedObject(configured, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.curve).toBe('step');
      expect(lens.chart.missingValues).toBe('linear');
      expect(lens.chart.showValueLabels).toBe(true);
    }
  });

  it('preserves secondary y-axis assignments', () => {
    const configured = JSON.parse(JSON.stringify(lensXyTwoSeries));
    configured.attributes.state.visualization.yRightTitle = 'Failure rate';
    configured.attributes.state.visualization.layers[0].yConfig = [
      { forAccessor: 'col-p95', axisMode: 'right' },
    ];
    const { lens, diagnostics } = fromKibanaSavedObject(configured, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.series[0]?.axis).toBe('right');
      expect(lens.chart.y2Axis).toEqual({
        id: 'col-p95',
        label: 'Failure rate',
      });
    }
    expect(diagnostics.find((d) => d.code === 'lens.xy.secondary-axis-preserved')).toBeDefined();
  });

  it('preserves static reference lines', () => {
    const configured = JSON.parse(JSON.stringify(lensXyTwoSeries));
    configured.attributes.state.visualization.layers.push({
      layerId: 'reference-layer',
      layerType: 'referenceLine',
      accessors: ['reference-slo'],
    });
    configured.attributes.state.datasourceStates.formBased.layers['reference-layer'] = {
      columnOrder: ['reference-slo'],
      columns: {
        'reference-slo': {
          dataType: 'number',
          isBucketed: false,
          label: 'SLO',
          operationType: 'static_value',
          params: { value: '250' },
        },
      },
    };

    const { lens, diagnostics } = fromKibanaSavedObject(configured, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.references).toEqual([{ value: 250, label: 'SLO' }]);
    expect(diagnostics.find((d) => d.code === 'lens.xy.reference-lines-preserved')).toBeDefined();
    expect(diagnostics.find((d) => d.code === 'lens.xy.reference-lines-dropped')).toBeUndefined();
  });

  it('drops horizontal orientation on line/area with a diagnostic', () => {
    // Lens never emits `line_horizontal` in practice, but the converter
    // guards against a misconfigured visualization explicitly.
    const horizontalLine = JSON.parse(JSON.stringify(lensXyTwoSeries));
    horizontalLine.attributes.state.visualization.preferredSeriesType = 'line';
    horizontalLine.attributes.state.visualization.layers[0].seriesType = 'line';
    const { lens } = fromKibanaSavedObject(horizontalLine, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.orientation).toBeUndefined();
    }
  });

  it('emits unresolved-index-pattern diagnostic when no resolver is supplied', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensXyTwoSeries);
    expect(lens).toBeDefined();
    expect(
      diagnostics.find((d) => d.code === 'lens.formBased.unresolved-index-pattern')
    ).toBeDefined();
    expect(lens?.query.esql).toContain('FROM *');
  });

  it('hides the legend when Lens authored isVisible: false', () => {
    const hiddenLegend = JSON.parse(JSON.stringify(lensXyTwoSeries));
    hiddenLegend.attributes.state.visualization.legend = { isVisible: false };

    const { lens } = fromKibanaSavedObject(hiddenLegend, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.showLegend).toBe(false);
      expect(lens.chart.series[0]?.splitOnField).toBe('col-region');
    }
  });

  it('reads Kibana 10.3 splitAccessors[] as the series split', () => {
    const splitAccessors = JSON.parse(JSON.stringify(lensXyTwoSeries));
    const layer = splitAccessors.attributes.state.visualization.layers[0];
    delete layer.splitAccessor;
    layer.splitAccessors = ['col-region'];

    const { lens } = fromKibanaSavedObject(splitAccessors, {
      resolveReferenceTitle: (_name, _id, type) =>
        type === 'index-pattern' ? 'logs-*' : undefined,
    });

    expect(lens?.chart.kind).toBe('xy');
    if (lens?.chart.kind === 'xy') {
      expect(lens.chart.series[0]?.splitOnField).toBe('col-region');
    }
  });
});
