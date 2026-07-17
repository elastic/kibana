/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Curated Raw Vega two-stack Sankey skeleton, adapted from the Elastic blog
 * "Sankey Visualization with Vega in Kibana" for Agent Builder:
 * - Canonical ES|QL source named `source` (stk1 / stk2 / size rows)
 * - Static diagram only (no click-to-filter / groupSelector signals)
 * - Vega v5 schema; panel-sized (no fixed width/height)
 *
 * Pipeline: source → fold+stack nodes → groups + edges (linkpath) → path/rect/text.
 */
export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  title: 'Sankey / flow',
  // Keep stack labels + bottom axis inside the Kibana panel (fit includes padding).
  padding: { left: 8, right: 8, top: 8, bottom: 28 },
  data: [
    {
      name: 'source',
      url: {
        '%type%': 'esql',
        query: `FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND DestCountry IS NOT NULL
| STATS size = COUNT() BY stk1 = OriginCountry, stk2 = DestCountry
| SORT size DESC
| LIMIT 40`,
      },
    },
    {
      name: 'nodes',
      source: 'source',
      transform: [
        { type: 'formula', expr: 'datum.stk1 + datum.stk2', as: 'key' },
        {
          type: 'fold',
          fields: ['stk1', 'stk2'],
          as: ['stack', 'grpId'],
        },
        {
          type: 'formula',
          expr:
            "datum.stack == 'stk1' ? datum.stk1 + ' ' + datum.stk2 : datum.stk2 + ' ' + datum.stk1",
          as: 'sortField',
        },
        {
          type: 'stack',
          groupby: ['stack'],
          sort: { field: 'sortField', order: 'descending' },
          field: 'size',
        },
        { type: 'formula', expr: '(datum.y0 + datum.y1) / 2', as: 'yc' },
      ],
    },
    {
      name: 'groups',
      source: 'nodes',
      transform: [
        {
          type: 'aggregate',
          groupby: ['stack', 'grpId'],
          fields: ['size'],
          ops: ['sum'],
          as: ['total'],
        },
        {
          type: 'stack',
          groupby: ['stack'],
          sort: { field: 'grpId', order: 'descending' },
          field: 'total',
        },
        { type: 'formula', expr: "scale('y', datum.y0)", as: 'scaledY0' },
        { type: 'formula', expr: "scale('y', datum.y1)", as: 'scaledY1' },
        { type: 'formula', expr: "datum.stack == 'stk1'", as: 'rightLabel' },
        {
          type: 'formula',
          expr: "datum.total / domain('y')[1]",
          as: 'percentage',
        },
      ],
    },
    {
      name: 'destinationNodes',
      source: 'nodes',
      transform: [{ type: 'filter', expr: "datum.stack == 'stk2'" }],
    },
    {
      name: 'edges',
      source: 'nodes',
      transform: [
        { type: 'filter', expr: "datum.stack == 'stk1'" },
        {
          type: 'lookup',
          from: 'destinationNodes',
          key: 'key',
          fields: ['key'],
          as: ['target'],
        },
        {
          type: 'linkpath',
          orient: 'horizontal',
          shape: 'diagonal',
          sourceY: { expr: "scale('y', datum.yc)" },
          sourceX: { expr: "scale('x', 'stk1') + bandwidth('x')" },
          targetY: { expr: "scale('y', datum.target.yc)" },
          targetX: { expr: "scale('x', 'stk2')" },
        },
        {
          type: 'formula',
          expr: "range('y')[0] - scale('y', datum.size)",
          as: 'strokeWidth',
        },
        {
          type: 'formula',
          expr: "datum.size / domain('y')[1]",
          as: 'percentage',
        },
      ],
    },
  ],
  scales: [
    {
      name: 'x',
      type: 'band',
      range: 'width',
      domain: ['stk1', 'stk2'],
      // Outer pad keeps the thin stacks off the panel edge so inward labels stay inside.
      paddingOuter: 0.12,
      paddingInner: 0.9,
    },
    {
      name: 'y',
      type: 'linear',
      range: 'height',
      nice: true,
      zero: true,
      domain: { data: 'nodes', field: 'y1' },
    },
    {
      name: 'color',
      type: 'ordinal',
      // Named "category" range — Kibana maps config.range.category to the theme palette.
      range: 'category',
      domain: { data: 'source', fields: ['stk1', 'stk2'] },
    },
    {
      name: 'stackNames',
      type: 'ordinal',
      range: ['Source', 'Destination'],
      domain: ['stk1', 'stk2'],
    },
  ],
  axes: [
    {
      orient: 'bottom',
      scale: 'x',
      domain: false,
      ticks: false,
      labelPadding: 6,
      encode: {
        labels: {
          update: {
            text: { scale: 'stackNames', field: 'value' },
          },
        },
      },
    },
  ],
  marks: [
    {
      type: 'path',
      name: 'edgeMark',
      from: { data: 'edges' },
      clip: true,
      encode: {
        update: {
          stroke: { scale: 'color', field: 'stk1' },
          strokeWidth: { field: 'strokeWidth' },
          path: { field: 'path' },
          strokeOpacity: { value: 0.4 },
          tooltip: {
            // ASCII arrow only — avoid unicode in Vega expression strings.
            signal:
              "datum.stk1 + ' -> ' + datum.stk2 + '  ' + format(datum.size, ',.0f') + ' (' + format(datum.percentage, '.1%') + ')'",
          },
        },
        hover: {
          strokeOpacity: { value: 0.9 },
        },
      },
    },
    {
      type: 'rect',
      name: 'groupMark',
      from: { data: 'groups' },
      encode: {
        enter: {
          fill: { scale: 'color', field: 'grpId' },
          width: { scale: 'x', band: 1 },
        },
        update: {
          x: { scale: 'x', field: 'stack' },
          y: { field: 'scaledY0' },
          y2: { field: 'scaledY1' },
          fillOpacity: { value: 0.7 },
          tooltip: {
            signal:
              "datum.grpId + '   ' + format(datum.total, ',.0f') + '   (' + format(datum.percentage, '.1%') + ')'",
          },
        },
        hover: {
          fillOpacity: { value: 1 },
        },
      },
    },
    {
      type: 'text',
      from: { data: 'groups' },
      interactive: false,
      encode: {
        update: {
          // Labels sit just inside each stack (toward the center), never past the panel edge.
          x: {
            signal:
              "scale('x', datum.stack) + (datum.rightLabel ? bandwidth('x') + 6 : -6)",
          },
          yc: { signal: '(datum.scaledY0 + datum.scaledY1) / 2' },
          align: { signal: "datum.rightLabel ? 'left' : 'right'" },
          baseline: { value: 'middle' },
          fontWeight: { value: 'bold' },
          // Omit tiny-slice labels so they do not crowd or overflow.
          text: {
            signal: "abs(datum.scaledY0 - datum.scaledY1) > 13 ? datum.grpId : ''",
          },
        },
      },
    },
  ],
};
