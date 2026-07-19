/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CANONICAL_ESQL_SOURCE_NAME, SANKEY_MIN_FLOWS } from '../dialect';

/**
 * Curated Raw Vega two-stack Sankey skeleton, adapted from the Elastic blog
 * "Sankey Visualization with Vega in Kibana" for Agent Builder:
 * - Canonical ES|QL source named `source` (stk1 / stk2 / size rows)
 * - Static diagram only (no click-to-filter / groupSelector signals)
 * - Vega v5 schema; panel-sized (no fixed width/height)
 *
 * Pipeline: source → fold+stack nodes → groups + edges (linkpath) → path/rect/text.
 */

/** Authoring rules injected into the Raw Vega prompt when catalog is sankey. */
export const chartRules = `SANKEY / FLOW RULES:
- Expect a two-stack flow table with stk1 / stk2 / size (or clear aliases in <columns>). Need ≥${SANKEY_MIN_FLOWS} flows.
- Follow the Elastic Kibana Sankey pattern (static slice — NO click-to-filter signals):
  1. Canonical source "${CANONICAL_ESQL_SOURCE_NAME}" with the ES|QL url.
  2. Derived "nodes": formula key=stk1+stk2 → fold stk1/stk2 into stack/grpId → stack by stack on size → yc midpoint.
  3. Derived "groups": aggregate nodes by stack+grpId → stack totals → scale y0/y1 to screen.
  4. Derived "destinationNodes" (filter stack==stk2) and "edges" (filter stk1, lookup target, linkpath diagonal, strokeWidth).
  5. Marks: path (edges), rect (groups), text (labels inward toward the center). Bottom axis with stackNames (Source / Destination).
- RESPONSIVE LAYOUT (required — labels must stay inside the panel):
  - Set padding: { left: 8, right: 8, top: 8, bottom: 28 } so the bottom axis is not clipped.
  - x band scale: paddingOuter ~0.12 and paddingInner ~0.9 so stacks sit inset from the edges.
  - Place group text labels INSIDE (toward center): left stack at band + 6 (align left); right stack at band - 6 (align right). Never place labels outside the stacks toward the panel edge.
  - Hide labels when the group height is < ~13px.
- Do NOT add groupSelector / groupHover click signals or "show all" buttons.
- NEVER set top-level root "encode" x/y; the panel sizes the view.
- Y SCALE (critical — wrong domain blanks the chart): MUST be
  \`{ "name": "y", "type": "linear", "range": "height", "nice": true, "zero": true, "domain": { "data": "nodes", "field": "y1" } }\`.
  Never \`domain: [0, 1]\` or any fixed numeric interval — stack totals are real counts/sums, not unit fractions.
- EXPRESSIONS: always lowercase helpers — scale(, bandwidth(, domain(, range(. Never Scale( / Bandwidth(.
- TOOLTIPS: ASCII only in signal strings (use " -> ", not unicode arrows).`;

/** Extra ES|QL instructions when generating a flow table for sankey. */
export const esqlAdditionalInstructions = `
## Sankey / flow rows (required)

This query feeds a Raw Vega two-stack Sankey (source → destination flows). Emit:
- \`stk1\`: source / left-stack category (keyword/string)
- \`stk2\`: destination / right-stack category (keyword/string)
- \`size\`: numeric flow weight (COUNT, SUM, …)

CRITICAL — Sankey integrity:
- At least ${SANKEY_MIN_FLOWS} flow rows (source→destination pairs).
- Filter null/empty endpoints before aggregating.
- Prefer a modest number of flows (SORT size DESC + LIMIT ~20–40) so stacks stay readable.
- Keep column names exactly \`stk1\`, \`stk2\`, and \`size\` when possible.

Recommended pattern (e.g. OriginCountry → DestCountry):

\`\`\`esql
FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND DestCountry IS NOT NULL
| STATS size = COUNT() BY stk1 = OriginCountry, stk2 = DestCountry
| SORT size DESC
| LIMIT 40
\`\`\``;

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
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
