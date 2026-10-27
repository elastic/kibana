/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { VegaNode } from './primitive';

const DAY = 86_400_000;
/** 2026-03-01T00:00:00Z. */
const START = 1_772_323_200_000;
const errorsPerDay = [12, 18, 41, 23, 9, 7, 15, 22, 31, 28, 19, 14, 11, 16];

export const vegaExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 480,
  height: 240,
  caption: 'Checkout errors peaked on Wednesday and fell back by Friday.',
  spec: {
    data: {
      values: [
        { day: 'Mon', errors: 12 },
        { day: 'Tue', errors: 18 },
        { day: 'Wed', errors: 41 },
        { day: 'Thu', errors: 23 },
        { day: 'Fri', errors: 9 },
      ],
    },
    mark: { type: 'bar', tooltip: true },
    encoding: {
      x: { field: 'day', type: 'ordinal', sort: null },
      y: { field: 'errors', type: 'quantitative' },
    },
  },
};

export const vegaGrammarExample: VegaNode = {
  type: 'vega',
  mode: 'vega',
  width: 320,
  height: 200,
  caption: 'Three regions by share of revenue.',
  spec: {
    data: [
      {
        name: 'table',
        values: [
          { region: 'EMEA', share: 0.42 },
          { region: 'AMER', share: 0.38 },
          { region: 'APAC', share: 0.2 },
        ],
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'band',
        domain: { data: 'table', field: 'region' },
        range: 'width',
        padding: 0.2,
      },
      {
        name: 'y',
        domain: { data: 'table', field: 'share' },
        range: 'height',
        nice: true,
      },
    ],
    axes: [
      { orient: 'bottom', scale: 'x' },
      { orient: 'left', scale: 'y', format: '%' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'table' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'region' },
            width: { scale: 'x', band: 1 },
            y: { scale: 'y', field: 'share' },
            y2: { scale: 'y', value: 0 },
            fill: { value: '#6092C0' },
          },
        },
      },
    ],
  },
};

/** A time range given as timestamps, as Kibana's `%timefilter%` resolves one. */
export const timeSeriesExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 560,
  height: 240,
  caption: 'Daily checkout errors over the first two weeks of March.',
  spec: {
    data: {
      values: errorsPerDay.map((errors, index) => ({
        timestamp: START + index * DAY,
        errors,
      })),
    },
    mark: { type: 'line', point: true },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        title: null,
        scale: { type: 'utc', domain: [START, START + 13 * DAY] },
        axis: { format: '%b %d', formatType: 'utc' },
      },
      y: { field: 'errors', type: 'quantitative' },
    },
  },
};

export const histogramExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 480,
  height: 240,
  caption: 'Most checkout requests finish in under 300 ms.',
  spec: {
    data: {
      values: [
        42, 55, 61, 78, 88, 93, 104, 117, 122, 131, 140, 152, 158, 166, 171, 183, 190, 204, 211,
        226, 238, 251, 263, 280, 296, 318, 344, 391, 452, 610,
      ].map((latency) => ({ latency })),
    },
    mark: 'bar',
    encoding: {
      x: {
        field: 'latency',
        type: 'quantitative',
        bin: { maxbins: 12 },
        title: 'Latency (ms)',
      },
      y: { aggregate: 'count', type: 'quantitative', title: 'Requests' },
    },
  },
};

export const layeredExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 560,
  height: 260,
  caption: 'Request volume against error rate, each on its own axis.',
  spec: {
    data: {
      values: [
        { hour: '00:00', requests: 1200, errorRate: 0.4 },
        { hour: '04:00', requests: 800, errorRate: 0.3 },
        { hour: '08:00', requests: 2600, errorRate: 0.9 },
        { hour: '12:00', requests: 3400, errorRate: 1.6 },
        { hour: '16:00', requests: 3100, errorRate: 1.1 },
        { hour: '20:00', requests: 2100, errorRate: 0.6 },
      ],
    },
    encoding: { x: { field: 'hour', type: 'ordinal', title: null } },
    layer: [
      {
        mark: { type: 'bar', opacity: 0.7 },
        encoding: {
          y: { field: 'requests', type: 'quantitative', title: 'Requests' },
        },
      },
      {
        mark: { type: 'line', point: true, color: '#D36086' },
        encoding: {
          y: {
            field: 'errorRate',
            type: 'quantitative',
            title: 'Error rate (%)',
          },
        },
      },
    ],
    resolve: { scale: { y: 'independent' } },
  },
};

export const facetExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 600,
  height: 240,
  caption: 'Each region’s error mix by service, side by side.',
  spec: {
    data: {
      values: ['EMEA', 'AMER', 'APAC'].flatMap((region, r) =>
        ['cart', 'payment', 'search'].map((service, s) => ({
          region,
          service,
          errors: 10 + ((r * 7 + s * 13) % 30),
        }))
      ),
    },
    facet: { column: { field: 'region', type: 'nominal', title: null } },
    spec: {
      width: 150,
      height: 150,
      mark: 'bar',
      encoding: {
        x: { field: 'service', type: 'nominal', title: null },
        y: { field: 'errors', type: 'quantitative' },
        color: { field: 'service', type: 'nominal', legend: null },
      },
    },
  },
};

export const heatmapExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 520,
  height: 240,
  caption: 'Errors cluster on weekday afternoons.',
  spec: {
    data: {
      values: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap((day, d) =>
        ['00', '04', '08', '12', '16', '20'].map((hour, h) => ({
          day,
          hour,
          errors: d < 5 && (h === 3 || h === 4) ? 30 + d * 3 : 4 + ((d + h) % 5),
        }))
      ),
    },
    mark: 'rect',
    encoding: {
      x: { field: 'hour', type: 'ordinal', title: 'Hour' },
      y: { field: 'day', type: 'ordinal', sort: null, title: null },
      color: { field: 'errors', type: 'quantitative' },
    },
  },
};

export const donutExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  width: 360,
  height: 240,
  caption: 'Payment errors are most of the total.',
  spec: {
    data: {
      values: [
        { service: 'payment', errors: 58 },
        { service: 'cart', errors: 21 },
        { service: 'search', errors: 13 },
        { service: 'auth', errors: 8 },
      ],
    },
    mark: { type: 'arc', innerRadius: 50 },
    encoding: {
      theta: { field: 'errors', type: 'quantitative' },
      color: { field: 'service', type: 'nominal', sort: null },
    },
  },
};

/** A signal bound to an input: the server draws its default, and a hydrated chart lets a reader move it. */
export const signalExample: VegaNode = {
  type: 'vega',
  mode: 'vega',
  width: 480,
  height: 240,
  caption: 'Hosts above the CPU threshold are highlighted.',
  spec: {
    signals: [
      {
        name: 'threshold',
        value: 70,
        bind: { input: 'range', min: 0, max: 100, step: 5 },
      },
    ],
    data: [
      {
        name: 'hosts',
        values: [
          { host: 'web-1', cpu: 42 },
          { host: 'web-2', cpu: 77 },
          { host: 'web-3', cpu: 63 },
          { host: 'db-1', cpu: 91 },
          { host: 'db-2', cpu: 55 },
        ],
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'band',
        domain: { data: 'hosts', field: 'host' },
        range: 'width',
        padding: 0.2,
      },
      { name: 'y', domain: [0, 100], range: 'height' },
    ],
    axes: [
      { orient: 'bottom', scale: 'x' },
      { orient: 'left', scale: 'y', title: 'CPU (%)' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'hosts' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'host' },
            width: { scale: 'x', band: 1 },
            y: { scale: 'y', field: 'cpu' },
            y2: { scale: 'y', value: 0 },
          },
          update: {
            fill: { signal: "datum.cpu > threshold ? '#E7664C' : '#54B399'" },
          },
        },
      },
      {
        type: 'rule',
        encode: {
          update: {
            x: { value: 0 },
            x2: { signal: 'width' },
            y: { scale: 'y', signal: 'threshold' },
            strokeDash: { value: [4, 4] },
          },
        },
      },
    ],
  },
};

/**
 * A search response inlined whole, with `format.property` naming the buckets,
 * as a host that runs a Kibana panel's query hands it over.
 */
export const searchResponseExample: VegaNode = {
  type: 'vega',
  mode: 'vega',
  width: 560,
  height: 220,
  caption: 'Documents per day, read from an inlined search response.',
  spec: {
    data: [
      {
        name: 'timeline',
        values: {
          took: 4,
          aggregations: {
            per_day: {
              buckets: errorsPerDay.map((errors, index) => ({
                key: START + index * DAY,
                doc_count: errors * 10,
              })),
            },
          },
        },
        format: { property: 'aggregations.per_day.buckets' },
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'utc',
        domain: { data: 'timeline', field: 'key' },
        range: 'width',
      },
      {
        name: 'y',
        domain: { data: 'timeline', field: 'doc_count' },
        range: 'height',
        nice: true,
        zero: true,
      },
    ],
    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        format: '%b %d',
        formatType: 'utc',
        labelOverlap: true,
      },
      { orient: 'left', scale: 'y', title: 'Documents' },
    ],
    marks: [
      {
        type: 'area',
        from: { data: 'timeline' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'key' },
            y: { scale: 'y', field: 'doc_count' },
            y2: { scale: 'y', value: 0 },
            fill: { value: '#6092C0' },
            fillOpacity: { value: 0.6 },
            interpolate: { value: 'monotone' },
          },
        },
      },
    ],
  },
};

/** Every example the Studio, conformance, and the docs show. */
export const vegaExamples: PrimitiveExample<VegaNode>[] = [
  { name: 'Vega-Lite bar chart', node: vegaExample },
  { name: 'Time series with a timestamp domain', node: timeSeriesExample },
  { name: 'Binned histogram', node: histogramExample },
  { name: 'Layered bars and line on two axes', node: layeredExample },
  { name: 'Faceted small multiples', node: facetExample },
  { name: 'Heatmap with a color legend', node: heatmapExample },
  { name: 'Donut', node: donutExample },
  { name: 'Vega bar chart', node: vegaGrammarExample },
  { name: 'Vega signal bound to an input', node: signalExample },
  { name: 'Inlined search response', node: searchResponseExample },
];
