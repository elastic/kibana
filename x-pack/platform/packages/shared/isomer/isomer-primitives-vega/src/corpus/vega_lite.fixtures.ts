/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpecObject } from '../spec';

import type { CorpusSpec } from './types';

const DAY = 86_400_000;
/** 2026-03-01T00:00:00Z. */
const START = 1_772_323_200_000;

/** `count` rows of a small, deterministic dataset with categorical, numeric, and time columns. */
const rows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    i,
    t: START + i * DAY,
    group: ['alpha', 'beta', 'gamma'][i % 3],
    kind: ['x', 'y'][i % 2],
    a: 10 + ((i * 37) % 53),
    b: 5 + ((i * 17) % 41),
    c: 1 + ((i * 7) % 11) / 3,
  }));

const vl = (name: string, spec: SpecObject, extra: Partial<CorpusSpec> = {}) => ({
  name: `Vega-Lite: ${name}`,
  mode: 'vega-lite' as const,
  spec: { data: { values: rows(24) }, ...spec },
  ...extra,
});

const x = { field: 'group', type: 'nominal' };
const y = { field: 'a', type: 'quantitative' };

export const vegaLiteSpecs: CorpusSpec[] = [
  // Marks.
  vl('bar', { mark: 'bar', encoding: { x, y: { ...y, aggregate: 'sum' } } }),
  vl('horizontal bar with labels', {
    encoding: { y: x, x: { ...y, aggregate: 'mean' } },
    layer: [
      { mark: 'bar' },
      {
        mark: { type: 'text', align: 'left', dx: 3 },
        encoding: { text: { field: 'a', aggregate: 'mean', format: '.1f' } },
      },
    ],
  }),
  vl('line over time', {
    mark: 'line',
    encoding: { x: { field: 't', type: 'temporal' }, y },
  }),
  vl('stacked area', {
    mark: 'area',
    encoding: {
      x: { field: 't', type: 'temporal' },
      y: { ...y, aggregate: 'sum' },
      color: x,
    },
  }),
  vl('normalized stacked bar', {
    mark: 'bar',
    encoding: {
      x: { field: 'kind', type: 'nominal' },
      y: { ...y, aggregate: 'sum', stack: 'normalize' },
      color: x,
    },
  }),
  vl('scatter with size and shape', {
    mark: 'point',
    encoding: {
      x: y,
      y: { field: 'b', type: 'quantitative' },
      size: { field: 'c', type: 'quantitative' },
      shape: x,
    },
  }),
  vl('tick strip', { mark: 'tick', encoding: { x: y, y: x } }),
  vl('rule at the mean', {
    layer: [
      {
        mark: 'point',
        encoding: { x: { field: 'i', type: 'quantitative' }, y },
      },
      { mark: 'rule', encoding: { y: { ...y, aggregate: 'mean' } } },
    ],
  }),
  vl('trail', {
    mark: 'trail',
    encoding: {
      x: { field: 't', type: 'temporal' },
      y,
      size: { field: 'c', type: 'quantitative' },
    },
  }),
  vl('pie', {
    mark: 'arc',
    encoding: { theta: { ...y, aggregate: 'sum' }, color: x },
  }),
  vl('boxplot', {
    mark: { type: 'boxplot', extent: 'min-max' },
    encoding: { x, y },
  }),
  vl('error bars from the standard deviation', {
    layer: [
      { mark: { type: 'errorbar', extent: 'stdev' }, encoding: { x, y } },
      { mark: 'point', encoding: { x, y: { ...y, aggregate: 'mean' } } },
    ],
  }),
  vl(
    'error band from a bootstrap',
    {
      mark: { type: 'errorband', extent: 'ci' },
      encoding: { x: { field: 'kind', type: 'nominal' }, y },
    },
    { random: true }
  ),

  // Transforms.
  vl('bin and count', {
    mark: 'bar',
    encoding: {
      x: { ...y, bin: { maxbins: 10 } },
      y: { aggregate: 'count', type: 'quantitative' },
    },
  }),
  vl('time unit', {
    mark: 'bar',
    encoding: {
      x: { field: 't', type: 'ordinal', timeUnit: 'utcday' },
      y: { ...y, aggregate: 'sum' },
    },
  }),
  vl('fold and color', {
    transform: [{ fold: ['a', 'b'], as: ['measure', 'value'] }],
    mark: 'line',
    encoding: {
      x: { field: 'i', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      color: { field: 'measure', type: 'nominal' },
    },
  }),
  vl('window rank and running sum', {
    transform: [
      {
        window: [{ op: 'sum', field: 'a', as: 'running' }],
        sort: [{ field: 'i' }],
      },
      {
        window: [{ op: 'rank', as: 'rank' }],
        sort: [{ field: 'a', order: 'descending' }],
      },
      { filter: 'datum.rank <= 10' },
    ],
    mark: 'line',
    encoding: {
      x: { field: 'i', type: 'quantitative' },
      y: { field: 'running', type: 'quantitative' },
    },
  }),
  vl('joinaggregate difference from the mean', {
    transform: [
      {
        joinaggregate: [{ op: 'mean', field: 'a', as: 'meanA' }],
        groupby: ['group'],
      },
      { calculate: 'datum.a - datum.meanA', as: 'diff' },
    ],
    mark: 'bar',
    encoding: {
      x: { field: 'i', type: 'ordinal' },
      y: { field: 'diff', type: 'quantitative' },
      color: x,
    },
  }),
  vl('lookup from a second inline dataset', {
    transform: [
      {
        lookup: 'group',
        from: {
          data: {
            values: [
              { group: 'alpha', label: 'Alpha team' },
              { group: 'beta', label: 'Beta team' },
              { group: 'gamma', label: 'Gamma team' },
            ],
          },
          key: 'group',
          fields: ['label'],
        },
      },
    ],
    mark: 'bar',
    encoding: {
      x: { field: 'label', type: 'nominal' },
      y: { ...y, aggregate: 'sum' },
    },
  }),
  vl('regression and loess', {
    encoding: { x: { field: 'i', type: 'quantitative' }, y },
    layer: [
      { mark: 'point' },
      { mark: 'line', transform: [{ regression: 'a', on: 'i' }] },
      {
        mark: { type: 'line', strokeDash: [4, 2] },
        transform: [{ loess: 'a', on: 'i' }],
      },
    ],
  }),
  vl('density', {
    transform: [{ density: 'a', groupby: ['kind'] }],
    mark: 'area',
    encoding: {
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'density', type: 'quantitative' },
      color: { field: 'kind', type: 'nominal' },
    },
  }),
  vl('quantiles', {
    transform: [{ quantile: 'a', step: 0.05 }],
    mark: 'point',
    encoding: {
      x: { field: 'prob', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
  }),
  vl('pivot', {
    transform: [{ pivot: 'kind', value: 'a', groupby: ['group'] }],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
      color: x,
    },
  }),
  vl('flatten nested arrays', {
    data: {
      values: [
        { k: 'p', vs: [1, 2, 3] },
        { k: 'q', vs: [4, 5] },
      ],
    },
    transform: [{ flatten: ['vs'] }],
    mark: 'bar',
    encoding: {
      x: { field: 'k', type: 'nominal' },
      y: { field: 'vs', type: 'quantitative', aggregate: 'sum' },
    },
  }),

  // Scales and formatting.
  vl('log scale', {
    data: { values: [1, 10, 100, 1000, 10000].map((v, i) => ({ i, v })) },
    mark: 'line',
    encoding: {
      x: { field: 'i', type: 'quantitative' },
      y: { field: 'v', type: 'quantitative', scale: { type: 'log' } },
    },
  }),
  vl('UTC time with a timestamp domain', {
    mark: 'line',
    encoding: {
      x: {
        field: 't',
        type: 'temporal',
        scale: { type: 'utc', domain: [START, START + 30 * DAY] },
      },
      y,
    },
  }),
  vl('named and diverging color schemes', {
    transform: [{ calculate: 'datum.a - 35', as: 'delta' }],
    mark: 'rect',
    encoding: {
      x: { field: 'i', type: 'ordinal' },
      y: { field: 'group', type: 'nominal' },
      color: {
        field: 'delta',
        type: 'quantitative',
        scale: { scheme: 'redblue', domainMid: 0 },
      },
    },
  }),
  vl('axis, number, and date formats', {
    mark: 'bar',
    encoding: {
      x: {
        field: 't',
        type: 'temporal',
        timeUnit: 'utcmonthdate',
        axis: { format: '%d %b', labelAngle: -45 },
      },
      y: { ...y, axis: { format: '$,.2f' } },
    },
    title: { text: 'Revenue', subtitle: 'per day' },
  }),

  // Composition.
  vl('horizontal and vertical concat', {
    vconcat: [
      {
        hconcat: [
          { mark: 'bar', encoding: { x, y: { ...y, aggregate: 'sum' } } },
          {
            mark: 'point',
            encoding: { x: y, y: { field: 'b', type: 'quantitative' } },
          },
        ],
      },
      { mark: 'line', encoding: { x: { field: 't', type: 'temporal' }, y } },
    ],
  }),
  vl('repeat', {
    repeat: ['a', 'b'],
    spec: {
      mark: 'bar',
      encoding: {
        x: { field: { repeat: 'repeat' }, type: 'quantitative', bin: true },
        y: { aggregate: 'count', type: 'quantitative' },
      },
    },
  }),
  vl('facet rows and columns', {
    facet: { row: { field: 'kind', type: 'nominal' }, column: x },
    spec: {
      mark: 'point',
      encoding: { x: y, y: { field: 'b', type: 'quantitative' } },
    },
  }),

  // Interactivity, drawn in its default state.
  vl('interval brush filtering a second view', {
    vconcat: [
      {
        params: [{ name: 'brush', select: { type: 'interval', encodings: ['x'] } }],
        mark: 'area',
        encoding: { x: { field: 't', type: 'temporal' }, y },
      },
      {
        transform: [{ filter: { param: 'brush' } }],
        mark: 'bar',
        encoding: { x, y: { ...y, aggregate: 'sum' } },
      },
    ],
  }),
  vl('legend-bound point selection', {
    params: [
      {
        name: 'pick',
        select: { type: 'point', fields: ['group'] },
        bind: 'legend',
      },
    ],
    mark: 'point',
    encoding: {
      x: y,
      y: { field: 'b', type: 'quantitative' },
      color: x,
      opacity: { condition: { param: 'pick', value: 1 }, value: 0.2 },
    },
  }),
  vl('point selection with an initial value', {
    params: [
      {
        name: 'pick',
        value: [{ group: 'beta' }],
        select: { type: 'point', fields: ['group'] },
      },
    ],
    mark: 'bar',
    encoding: {
      x,
      y: { ...y, aggregate: 'sum' },
      color: {
        condition: { param: 'pick', field: 'group', type: 'nominal' },
        value: '#ccc',
      },
    },
  }),
  vl('parameter bound to a range input', {
    params: [{ name: 'cutoff', value: 30, bind: { input: 'range', min: 0, max: 60 } }],
    mark: 'bar',
    encoding: {
      x: { field: 'i', type: 'ordinal' },
      y,
      color: {
        condition: { test: 'datum.a > cutoff', value: '#E7664C' },
        value: '#54B399',
      },
    },
  }),

  // Geography, from inline GeoJSON.
  vl('geoshape', {
    data: {
      values: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'west', v: 3 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-10, 40],
                  [0, 40],
                  [0, 50],
                  [-10, 50],
                  [-10, 40],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'east', v: 7 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 40],
                  [10, 40],
                  [10, 50],
                  [0, 50],
                  [0, 40],
                ],
              ],
            },
          },
        ],
      },
      format: { type: 'json', property: 'features' },
    },
    projection: { type: 'mercator' },
    mark: 'geoshape',
    encoding: { color: { field: 'properties.v', type: 'quantitative' } },
  }),
];
