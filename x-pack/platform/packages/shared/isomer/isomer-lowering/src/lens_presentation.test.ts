/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyLensState, heatmapBands, presentationHints, toneOfColor } from './lens_presentation';

const xyLens = (visualization: Record<string, unknown>) => ({
  visualizationType: 'lnsXY',
  state: { visualization: { layers: [{ layerType: 'data', accessors: ['a'] }], ...visualization } },
});

const xyNode = (withY2: boolean) => ({
  type: 'xyChart',
  y: {},
  ...(withY2 ? { y2: {} } : {}),
  series: [{ key: 'a', label: 'A', points: [{ x: 'p', y: 1 }] }],
});

describe('applyLensState', () => {
  it('maps a custom left extent to y.domain', () => {
    const node = xyNode(false);
    expect(
      applyLensState(
        xyLens({ yLeftExtent: { mode: 'custom', lowerBound: 0, upperBound: 1 } }),
        node
      )
    ).toEqual([]);
    expect(node.y).toEqual({ domain: { min: 0, max: 1 } });
  });

  it('ignores a half-open custom extent unless it is enforced, as Lens does', () => {
    const open = xyNode(false);
    applyLensState(xyLens({ yLeftExtent: { mode: 'custom', upperBound: 1 } }), open);
    expect(open.y).toEqual({});
    const enforced = xyNode(false);
    applyLensState(
      xyLens({ yLeftExtent: { mode: 'custom', upperBound: 1, enforce: true } }),
      enforced
    );
    expect(enforced.y).toEqual({ domain: { max: 1 } });
  });

  it('maps a right extent only when the node has a y2 axis', () => {
    const extent = { yRightExtent: { mode: 'custom', lowerBound: 0, upperBound: 1 } };
    const withY2 = xyNode(true);
    applyLensState(xyLens(extent), withY2);
    expect(withY2.y2).toEqual({ domain: { min: 0, max: 1 } });
    const without = xyNode(false);
    expect(applyLensState(xyLens(extent), without)).toEqual([]);
    expect(without).not.toHaveProperty('y2');
  });

  it('leaves full and data-bound extents to the data', () => {
    const node = xyNode(false);
    expect(applyLensState(xyLens({ yLeftExtent: { mode: 'dataBounds' } }), node)).toEqual([]);
    expect(node.y).toEqual({});
  });

  it('maps a log scale and refuses one the spec lacks', () => {
    const node = xyNode(false);
    expect(applyLensState(xyLens({ yLeftScale: 'log' }), node)).toEqual([]);
    expect(node.y).toEqual({ scale: 'log' });
    expect(applyLensState(xyLens({ yLeftScale: 'sqrt' }), xyNode(false))).toEqual(['y scale sqrt']);
  });

  it('refuses color by value it cannot place', () => {
    const metric = {
      visualizationType: 'lnsMetric',
      state: { visualization: { palette: { name: 'status' } } },
    };
    expect(applyLensState(metric, { type: 'metricTrend' })).toEqual([
      'color by value without stops',
    ]);
    const percent = {
      visualizationType: 'lnsMetric',
      state: {
        visualization: {
          palette: {
            params: { rangeType: 'percent', colorStops: [{ color: '#f66d64', stop: 0 }] },
          },
        },
      },
    };
    expect(applyLensState(percent, { type: 'metricTrend' })).toEqual([
      'color by value in percent on a metric without a max',
    ]);
  });
});

describe('presentationHints', () => {
  it('colors a split in rank order and takes a series color over the palette', () => {
    const split = xyLens({ legend: { isVisible: true, position: 'right' } });
    (split.state.visualization.layers as Array<Record<string, unknown>>)[0]!.splitAccessor = 's';
    const node = {
      type: 'xyChart',
      series: [
        { label: 'small', points: [{ x: 1, y: 1 }] },
        { label: 'big', points: [{ x: 1, y: 9 }] },
      ],
    };
    const { seriesColors, legend } = presentationHints(split, node, {}) as {
      seriesColors: Record<string, string>;
      legend: unknown;
    };
    expect(seriesColors).toEqual({ big: '#16C5C0', small: '#A6EDEA' });
    expect(legend).toEqual({ show: true, position: 'right' });

    const colored = xyLens({
      layers: [
        { layerType: 'data', accessors: ['a'], yConfig: [{ forAccessor: 'a', color: '#123456' }] },
      ],
    });
    expect(
      (presentationHints(colored, xyNode(false), {}) as { seriesColors: unknown }).seriesColors
    ).toEqual({ a: '#123456' });
  });
});

describe('date histograms', () => {
  const lens = (operationType: string, customLabel = false) => ({
    visualizationType: 'lnsXY',
    state: {
      visualization: { layers: [{ layerType: 'data', accessors: ['m'], xAccessor: 't' }] },
      datasourceStates: {
        formBased: {
          layers: {
            l: {
              columns: {
                t: {
                  operationType: 'date_histogram',
                  label: 'timestamp',
                  customLabel,
                  params: { includeEmptyRows: true },
                },
                m: { operationType },
              },
            },
          },
        },
      },
    },
  });
  const node = () => ({
    type: 'xyChart',
    x: {
      type: 'time',
      title: 'timestamp',
      interval: { value: 1, unit: 'hour' },
      domain: { from: '2026-10-14T00:30:00.000Z', to: '2026-10-14T03:00:00.000Z' },
    },
    y: {},
    series: [{ key: 'm', label: 'M', points: [{ x: '2026-10-14T01:00:00.000Z', y: 4 }] }],
  });

  it('fills empty buckets of a count with zero across the window and titles the axis per interval', () => {
    const counted = node();
    applyLensState(lens('count'), counted);
    expect(counted.series[0]!.points).toEqual([
      { x: '2026-10-14T00:00:00.000Z', y: 0 },
      { x: '2026-10-14T01:00:00.000Z', y: 4 },
      { x: '2026-10-14T02:00:00.000Z', y: 0 },
    ]);
    expect(counted.x.title).toBe('timestamp per hour');
  });

  it('leaves an average and a custom label alone', () => {
    const averaged = node();
    applyLensState(lens('average', true), averaged);
    expect(averaged.series[0]!.points).toHaveLength(1);
    expect(averaged.x.title).toBe('timestamp');
  });
});

describe('color by value', () => {
  it('reads Lens palette colors as status tones', () => {
    expect(
      ['#f66d64', '#D23115', '#fcd279', '#FCC400', '#23be8f', '#68BC00', '#61a2ff', '#f6f9fc'].map(
        toneOfColor
      )
    ).toEqual([
      'danger',
      'danger',
      'warning',
      'warning',
      'success',
      'success',
      'neutral',
      'neutral',
    ]);
  });

  it('turns number stops with continuity above into bands that start at the first stop', () => {
    const palette = {
      params: {
        rangeType: 'number',
        continuity: 'above',
        colorStops: [
          { color: '#D23115', stop: 0 },
          { color: '#FCC400', stop: 500 },
          { color: '#68BC00', stop: 1000 },
        ],
      },
    };
    const node = { type: 'metricTrend', value: 800 };
    expect(
      applyLensState(
        { visualizationType: 'lnsMetric', state: { visualization: { palette } } },
        node
      )
    ).toEqual([]);
    expect(node).toHaveProperty('bands', [
      { from: 0, tone: 'danger' },
      { from: 500, tone: 'warning' },
      { from: 1000, tone: 'success' },
    ]);
  });

  it('resolves percent end stops against a gauge domain', () => {
    const palette = {
      params: {
        rangeType: 'percent',
        rangeMin: 0,
        continuity: 'all',
        stops: [
          { color: '#23be8f', stop: 50 },
          { color: '#f66d64', stop: 100 },
        ],
      },
    };
    const node = { type: 'gauge', value: 10, domain: { min: 0, max: 300 } };
    applyLensState({ visualizationType: 'lnsMetric', state: { visualization: { palette } } }, node);
    expect(node).toHaveProperty('bands', [
      { to: 150, tone: 'success' },
      { to: 300, tone: 'danger' },
    ]);
  });

  it('steps a default heatmap palette evenly from the smallest cell to the largest', () => {
    expect(
      heatmapBands({}, { type: 'heatmap', cells: [{ value: 0 }, { value: 50 }, { value: null }] })
    ).toEqual({
      bands: [
        { from: 0, to: 10 },
        { from: 10, to: 20 },
        { from: 20, to: 30 },
        { from: 30, to: 40 },
        { from: 40 },
      ],
      colors: ['#61a2ff', '#cfe1ff', '#f6f9fc', '#ffd4cf', '#f6726a'],
    });
  });
});
