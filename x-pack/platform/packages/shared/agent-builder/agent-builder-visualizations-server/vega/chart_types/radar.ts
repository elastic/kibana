/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CANONICAL_ESQL_SOURCE_NAME } from '../dialect';
import {
  RADAR_DISCLOSED_FALLBACK_CONTEXT,
  RADAR_MIN_KEYS,
  formatRadarIntegrityError,
  validateRadarRows,
} from './radar_integrity';
import { wrapIntegrity, type RawVegaChartTypeEntry } from './types';

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

const esqlAdditionalInstructions = `
## Radar / spider rows (required)

This query feeds a Raw Vega radar chart. Emit a flat table with:
- \`key\`: axis / spoke label (keyword/string) — the multivariate dimension
- \`value\`: numeric measure on that axis (COUNT, SUM, AVG, …)
- \`series\` (optional): series / group label when comparing multiple radars on one chart

CRITICAL — radar shape (structural; empty/sparse sample windows are OK):
- \`value\` must be numeric for every row.
- Aim for at least ${RADAR_MIN_KEYS} distinct \`key\` values when the data supports it (soft guidance — do not over-filter just to hit a count).
- Prefer a modest number of axes (about 5–8) so labels stay readable — SORT + LIMIT when needed.
- For a single series, either omit \`series\` or set a constant (e.g. \`EVAL series = "all"\`).
- For multi-series, emit one row per (series, key) pair with the same key set across series when possible.

Recommended single-series pattern:

\`\`\`esql
FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL
| STATS value = COUNT() BY key = OriginCountry
| SORT value DESC
| LIMIT 6
\`\`\`

Recommended multi-series pattern (same keys across series — one measure):

\`\`\`esql
FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND Carrier IS NOT NULL
| STATS value = COUNT() BY series = Carrier, key = OriginCountry
| SORT value DESC
| LIMIT 24
\`\`\`

To keep only series that appear on ≥${RADAR_MIN_KEYS} keys, use INLINE STATS on the
already-aggregated grain (do **not** COUNT_DISTINCT the same field you group by):

\`\`\`esql
FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND Carrier IS NOT NULL
| STATS value = COUNT() BY series = Carrier, key = OriginCountry
| INLINE STATS n_keys = COUNT_DISTINCT(key) BY series
| WHERE n_keys >= ${RADAR_MIN_KEYS}
| DROP n_keys
| SORT value DESC
| LIMIT 40
\`\`\`

Rules:
- Keep column names exactly \`key\`, \`value\`, and optional \`series\` when possible.
- Prefer ONE numeric measure. Do NOT use FORK / wide unpivots that mix units
  (e.g. flight time vs ticket price vs distance) unless you also normalize each
  key to a 0–1 scale — mixed units make a useless radar and often break layout.
- NEVER write \`STATS … COUNT_DISTINCT(OriginCountry) BY … key = OriginCountry\` (or the
  same field for both). That distinct count is always 1, so \`WHERE … >= 3\` returns
  **zero rows** and the chart goes blank (Infinite extent warnings).`;

export const chartType: RawVegaChartTypeEntry = {
  dialect: 'vega',
  id: 'radar',
  chartLabel: 'radar / spider',
  prompt: {
    selection: {
      title: 'Radar / spider (Raw Vega polar)',
      description:
        'Radar / spider / polar multivariate chart comparing numeric measures across several axes (not a pie or radial bar).',
      guideline:
        'Choose radar when the user clearly wants a radar / spider / polar multivariate chart across several numeric axes.',
    },
    config: {
      rulesHeading: 'RADAR / SPIDER RULES',
      perChartTypeRules: [
        `Expect a key / value table (optional series). Prefer ≥${RADAR_MIN_KEYS} distinct keys when data allows.`,
        'Scales: angular (point, domain = key, range [-PI, PI]) and radial (linear, domain = value, range [0, radius]).',
        'MARKS ARRAY SHAPE (critical — malformed marks blank the chart):\n  - Top-level "marks" is a FLAT array of sibling mark objects: [group|line, rule, text, line, …].\n  - The faceted series "group" is ONE object whose nested "marks" contains ONLY the closed polygon line(s).\n  - Grid "rule", spoke "text", and outer "line" are SIBLINGS of that group — never extra properties on the group after its nested marks close.\n  - Copy the reference example mark list structure; do not merge siblings into one object.',
        `Marks content: grid rules + labels from aggregated keys; closed polygon via line marks with interpolate "linear-closed".\n  - Multi-series: facet the Canonical source by series (groupby series) and draw one closed line per facet.\n  - Single-series (no series column): one closed line from "${CANONICAL_ESQL_SOURCE_NAME}" (no facet required).`,
        'RESPONSIVE LAYOUT (required — fill and center the Kibana panel):\n  - NEVER set top-level "encode" x/y (official Vega radar does this; in Kibana it shoves the chart into a corner).\n  - NEVER use autosize "none" — Kibana disables panel sizing and the chart goes blank.\n  - Center in EVERY mark signal: width/2 + …, height/2 + … (same idea as sunburst arc x/y).\n  - radius signal: min(width, height) / 2 - 40 (reserves space for spoke labels inside the panel).\n  - Labels at width/2 + (radius + 8) * cos(…), height/2 + (radius + 8) * sin(…).\n  - Prefer short key labels (LIMIT axes); avoid large fontSize.',
        'EXPRESSIONS: always lowercase helpers — scale(, cos(, sin(. Never Scale(.',
      ],
      esqlAdditionalInstructions,
    },
  },
  example: {
    description:
      'Static radar: key/value rows (≥3 distinct keys; optional series) → angular + radial scales → faceted `line` marks with `linear-closed`. Center with absolute width/2 + height/2 in mark signals (never top-level encode). Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
    load: () => import('./radar').then((module) => module.spec),
  },
  disclosedFallbackContext: RADAR_DISCLOSED_FALLBACK_CONTEXT,
  checkIntegrity: wrapIntegrity(validateRadarRows, formatRadarIntegrityError),
};

/** @deprecated Prefer chartType.prompt.config.esqlAdditionalInstructions */
export { esqlAdditionalInstructions };

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
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
      // Named "category" range — Kibana maps config.range.category to the theme palette.
      range: 'category',
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
