/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CANONICAL_ESQL_SOURCE_NAME } from '../dialect';
import {
  SUNBURST_DISCLOSED_FALLBACK_CONTEXT,
  formatParentChildIntegrityError,
  validateParentChildRows,
} from './sunburst_integrity';
import { wrapIntegrity, type RawVegaChartTypeEntry } from './types';

/**
 * Curated Raw Vega sunburst skeleton. Normalize rebinds the Canonical ES|QL
 * source; the model must adapt field names to the Parent–child table columns.
 * Static diagram only — no Kibana interaction helpers.
 *
 * The example query emits ONE synthetic root, mid-level parents, and leaves
 * (via FORK) so Vega `stratify` never hits "missing: <id>" or "multiple roots".
 */

const esqlAdditionalInstructions = `
## Sunburst hierarchy rows (required)

This query feeds a Raw Vega sunburst. Emit a flat Parent–child table the Vega \`stratify\` transform can consume:
- \`id\`: unique node id (keyword/string)
- \`parent\`: parent node id (same type); use real \`null\` (not the string "null") for the single root only
- \`name\`: display label for the node
- \`value\`: non-negative numeric measure used for partition sizing (typically a COUNT or SUM)

CRITICAL — stratify integrity:
- Exactly ONE root row: \`id = "root"\`, \`parent = null\`. Multiple category rows with \`parent = null\` → Vega errors with \`multiple roots\` (then partition fails).
- Do NOT set \`parent = null\` on OriginCountry/category rows. Point those at \`parent = "root"\`.
- For EVERY non-null \`parent\` value, there MUST be another row whose \`id\` equals that parent (avoid \`missing: X\`).
- Leaf-only tables are INVALID. Always emit: 1 synthetic root + mid-level parents + leaves.
- Use \`parent = null\` (literal null), never \`TO_STRING(null)\` (that becomes the string "null").

Recommended pattern (e.g. OriginCountry → DestCountry) with a single synthetic root:

\`\`\`esql
FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND DestCountry IS NOT NULL
| FORK
  (STATS value = COUNT()
   | EVAL id = "root", parent = null, name = "All"
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry
   | EVAL id = OriginCountry, parent = "root", name = OriginCountry
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry, DestCountry
   | SORT value DESC
   | LIMIT 40
   | EVAL id = CONCAT(OriginCountry, "::", DestCountry), parent = OriginCountry, name = DestCountry
   | KEEP id, parent, name, value)
\`\`\`

Rules:
- Prefer aggregating to a modest number of leaf nodes (SORT + LIMIT) so the sunburst stays readable.
- Keep column names exactly \`id\`, \`parent\`, \`name\`, and \`value\` when possible.`;

export const chartType: RawVegaChartTypeEntry = {
  dialect: 'vega',
  id: 'sunburst',
  chartLabel: 'sunburst / hierarchy',
  prompt: {
    selection: {
      title: 'Sunburst / hierarchy (Raw Vega partition)',
      description:
        'Radial hierarchy / sunburst / ring partition of a parent-child tree (not a treemap, pie, or donut).',
      guideline:
        'Choose sunburst when the user clearly wants a sunburst / radial hierarchy / ring partition of a tree.',
    },
    config: {
      rulesHeading: 'SUNBURST RULES',
      perChartTypeRules: [
        'Expect a Parent–child table with id / parent / name / value (or clear aliases present in <columns>). Exactly one root (parent null); every other parent id must exist as an id row — otherwise stratify fails with "missing: <id>" / "multiple roots" and partition cannot run.',
        `Pipeline: source → stratify(key=id, parentKey=parent) → partition(field=value) → arc marks. Put both transforms on the same derived dataset that sources "${CANONICAL_ESQL_SOURCE_NAME}".`,
        'Built-in width/height signals for layout (e.g. partition size, arc x/y) are fine.',
      ],
      esqlAdditionalInstructions,
    },
  },
  example: {
    description:
      'Static radial hierarchy: Parent–child table (parent rows AND leaves — every parent id must exist as an id) → `stratify` + `partition` → `arc` marks. Bind the Canonical ES|QL source named `source`; do not add Kibana interaction signals.',
    load: () => import('./sunburst').then((module) => module.spec),
  },
  disclosedFallbackContext: SUNBURST_DISCLOSED_FALLBACK_CONTEXT,
  checkIntegrity: wrapIntegrity(validateParentChildRows, formatParentChildIntegrityError),
};

/** @deprecated Prefer chartType.prompt.config.esqlAdditionalInstructions */
export { esqlAdditionalInstructions };

export const spec: Record<string, unknown> = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  data: [
    {
      name: 'source',
      url: {
        '%type%': 'esql',
        query: `FROM kibana_sample_data_flights
| WHERE OriginCountry IS NOT NULL AND DestCountry IS NOT NULL
| FORK
  (STATS value = COUNT()
   | EVAL id = "root", parent = null, name = "All"
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry
   | EVAL id = OriginCountry, parent = "root", name = OriginCountry
   | KEEP id, parent, name, value)
  (STATS value = COUNT() BY OriginCountry, DestCountry
   | SORT value DESC
   | LIMIT 40
   | EVAL id = CONCAT(OriginCountry, "::", DestCountry), parent = OriginCountry, name = DestCountry
   | KEEP id, parent, name, value)`,
      },
    },
    {
      name: 'tree',
      source: 'source',
      transform: [
        { type: 'stratify', key: 'id', parentKey: 'parent' },
        {
          type: 'partition',
          field: 'value',
          sort: { field: 'value', order: 'descending' },
          size: [{ signal: '2 * PI' }, { signal: 'min(width, height) / 2' }],
        },
      ],
    },
  ],
  scales: [
    {
      name: 'color',
      type: 'ordinal',
      domain: { data: 'tree', field: 'depth' },
      range: { scheme: 'blues' },
    },
  ],
  marks: [
    {
      type: 'arc',
      from: { data: 'tree' },
      encode: {
        enter: {
          x: { signal: 'width / 2' },
          y: { signal: 'height / 2' },
          fill: { scale: 'color', field: 'depth' },
          tooltip: { signal: "datum.name + ': ' + datum.value" },
        },
        update: {
          startAngle: { field: 'x0' },
          endAngle: { field: 'x1' },
          innerRadius: { field: 'y0' },
          outerRadius: { field: 'y1' },
          stroke: { value: 'white' },
        },
      },
    },
  ],
};
