/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Curated Raw Vega radar / spider skeleton. Normalize rebinds the Canonical
 * ES|QL source; the model must adapt field names to the key / value (/ series)
 * columns. Static diagram only — no Kibana interaction helpers.
 *
 * Pattern follows the official Vega radar example: angular + radial scales,
 * faceted line marks with linear-closed interpolation.
 */
export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  title: 'Radar / spider',
  signals: [{ name: 'radius', update: 'min(width, height) / 2' }],
  data: [
    {
      name: 'source',
      url: {
        '%type%': 'esql',
        query: `FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL
| STATS value = COUNT() BY key = OriginCountry
| SORT value DESC
| LIMIT 6
| EVAL series = "flights"
| KEEP key, value, series`,
      },
    },
    {
      name: 'keys',
      source: 'source',
      transform: [{ type: 'aggregate', groupby: ['key'] }],
    },
  ],
  scales: [
    {
      name: 'angular',
      type: 'point',
      range: { signal: '[-PI, PI]' },
      padding: 0.5,
      domain: { data: 'source', field: 'key' },
    },
    {
      name: 'radial',
      type: 'linear',
      range: { signal: '[0, radius]' },
      zero: true,
      nice: false,
      domain: { data: 'source', field: 'value' },
      domainMin: 0,
    },
    {
      name: 'color',
      type: 'ordinal',
      domain: { data: 'source', field: 'series' },
      range: { scheme: 'category10' },
    },
  ],
  encode: {
    enter: {
      x: { signal: 'width / 2' },
      y: { signal: 'height / 2' },
    },
  },
  marks: [
    {
      type: 'group',
      name: 'series',
      zindex: 1,
      from: {
        facet: { data: 'source', name: 'facet', groupby: ['series'] },
      },
      marks: [
        {
          type: 'line',
          name: 'series-line',
          from: { data: 'facet' },
          encode: {
            enter: {
              interpolate: { value: 'linear-closed' },
              x: {
                signal: "scale('radial', datum.value) * cos(scale('angular', datum.key))",
              },
              y: {
                signal: "scale('radial', datum.value) * sin(scale('angular', datum.key))",
              },
              stroke: { scale: 'color', field: 'series' },
              strokeWidth: { value: 2 },
              fill: { scale: 'color', field: 'series' },
              fillOpacity: { value: 0.1 },
              tooltip: {
                signal: "datum.key + ': ' + datum.value",
              },
            },
          },
        },
      ],
    },
    {
      type: 'rule',
      name: 'radial-grid',
      from: { data: 'keys' },
      zindex: 0,
      encode: {
        enter: {
          x: { value: 0 },
          y: { value: 0 },
          x2: { signal: "radius * cos(scale('angular', datum.key))" },
          y2: { signal: "radius * sin(scale('angular', datum.key))" },
          stroke: { value: 'lightgray' },
          strokeWidth: { value: 1 },
        },
      },
    },
    {
      type: 'text',
      name: 'key-label',
      from: { data: 'keys' },
      zindex: 1,
      encode: {
        enter: {
          x: { signal: "(radius + 8) * cos(scale('angular', datum.key))" },
          y: { signal: "(radius + 8) * sin(scale('angular', datum.key))" },
          text: { field: 'key' },
          align: [
            { test: 'abs(scale("angular", datum.key)) > PI / 2', value: 'right' },
            { value: 'left' },
          ],
          baseline: [
            { test: 'scale("angular", datum.key) > 0', value: 'top' },
            { test: 'scale("angular", datum.key) == 0', value: 'middle' },
            { value: 'bottom' },
          ],
          fill: { value: 'black' },
          fontWeight: { value: 'bold' },
        },
      },
    },
    {
      type: 'line',
      name: 'outer-line',
      from: { data: 'radial-grid' },
      encode: {
        enter: {
          interpolate: { value: 'linear-closed' },
          x: { field: 'x2' },
          y: { field: 'y2' },
          stroke: { value: 'lightgray' },
          strokeWidth: { value: 1 },
        },
      },
    },
  ],
};
