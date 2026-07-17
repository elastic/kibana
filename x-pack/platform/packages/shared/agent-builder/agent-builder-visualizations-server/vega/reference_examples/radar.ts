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
 * Center with absolute width/2 + height/2 in mark signals (same pattern as
 * sunburst). Do NOT use top-level encode x/y — with Kibana panel sizing that
 * offsets the chart into a corner. Reserve label space in the radius signal
 * instead of relying on padding.
 */
export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  title: 'Radar / spider',
  // Leave room for spoke labels inside the panel (no top-level encode/padding).
  signals: [{ name: 'radius', update: 'min(width, height) / 2 - 40' }],
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
                signal:
                  "width / 2 + scale('radial', datum.value) * cos(scale('angular', datum.key))",
              },
              y: {
                signal:
                  "height / 2 + scale('radial', datum.value) * sin(scale('angular', datum.key))",
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
          x: { signal: 'width / 2' },
          y: { signal: 'height / 2' },
          x2: { signal: "width / 2 + radius * cos(scale('angular', datum.key))" },
          y2: { signal: "height / 2 + radius * sin(scale('angular', datum.key))" },
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
          x: { signal: "width / 2 + (radius + 8) * cos(scale('angular', datum.key))" },
          y: { signal: "height / 2 + (radius + 8) * sin(scale('angular', datum.key))" },
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
