/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

/**
 * Describe the result columns of the backing ES|QL query so the model binds Vega
 * encodings to real field names and types.
 */
const formatColumns = (columns: EsqlEsqlColumnInfo[] | undefined): string => {
  if (!columns || columns.length === 0) {
    return 'No column information is available; infer fields from the ES|QL query.';
  }

  return columns.map((column) => `- "${column.name}" (${column.type})`).join('\n');
};

export const createGenerateVegaSpecPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  existingSpec,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  columns: EsqlEsqlColumnInfo[] | undefined;
  existingSpec?: string;
  additionalContext?: string;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a Kibana Vega visualization expert. Author a single raw Vega v5 specification (NOT Vega-Lite) for a custom visualization that Kibana Lens cannot express — for example Sankey/flow diagrams, small multiples, network/arc/chord diagrams, or other bespoke layouts.

You are using raw Vega (not Vega-Lite) on purpose: it scales to fill the dashboard panel and can express visualizations Vega-Lite cannot.

SCHEMA:
- The top-level "$schema" MUST be "https://vega.github.io/schema/vega/v5.json".
- Use raw Vega structure: top-level "data" (an ARRAY of data sets), "scales", "axes" and/or "legends", "marks", and optional "signals". Do NOT use Vega-Lite "mark"/"encoding"/"layer"/"facet" — those are Vega-Lite only.

DATA (critical):
- The top-level "data" array MUST contain a base data set named EXACTLY "source". Do NOT give "source" a "url" or "values" — Kibana injects the ES|QL query results into it for you.
- The injected data is an ARRAY OF ROW OBJECTS, one object per ES|QL result row, keyed by column name. Example row: { "Source": "US", "Destination": "DE", "Count": 42 }.
- Derive every other data set FROM "source", e.g. { "name": "nodes", "source": "source", "transform": [ ... ] }. Never invent another "url", index, or query.
- Reference column values by their EXACT name (including spaces and capitalization): use { "field": "Count" } in scale domains and mark encodings, and datum['Count'] in expression strings.

ES|QL query backing "source":
<esql>
${esqlQuery}
</esql>

Columns available in "source":
<columns>
${formatColumns(columns)}
</columns>

DOTS IN FIELD NAMES:
- Vega treats an unescaped dot in a field name as nested-object access, but ES|QL columns are flat. For a column whose name contains a dot (e.g. "geo.dest"), backslash-escape every dot in "field"/"groupby" strings ("geo\\.dest") and use bracket access in expressions (datum['geo.dest']). Prefer dot-free column names.

SIZING / RESPONSIVENESS (critical):
- Do NOT set top-level "width" or "height". Kibana sizes the chart to the panel and exposes "width" and "height" signals automatically.
- Make the chart fill the panel by binding scale ranges to the view size: use "range": "width" for horizontal scales and "range": "height" for vertical scales (or reference the "width"/"height" signals in expressions). This is what makes the visualization responsive.

DESIGN:
- Make the chart self-explanatory: set a top-level "title" and give axes/legends clear titles.
- Keep the spec minimal: include only the data sets, scales, axes, marks, and signals needed to render the requested visualization.
- SCALES: define EVERY scale in the top-level "scales" array. Any scale name referenced by an axis ("scale": "x"), a legend ("fill": "color"), or a mark encoding ({ "scale": "color" }) MUST be defined there. Do NOT put scales under any other key (e.g. no "_secondary_scales") and do NOT reference a scale that is not in "scales" — Vega fails with "Unrecognized scale name". For a color legend, define an ordinal color scale in "scales" and point the legend's "fill"/"stroke" at it.
- LEGENDS: prefer a plain legend bound to a scale (e.g. { "fill": "color" }). Inside "legends[].encode.symbols", the "size" and "strokeWidth" channels MUST be a single value/signal object (e.g. { "value": 100 }) — never a conditional/production-rule array of { "test": ... } entries (Vega uses them to lay out the symbol and fails to parse). If you need per-entry symbol styling, build a custom legend from ordinary marks instead.
${
  existingSpec
    ? `
Existing spec to modify (keep what still applies, change only what the request asks for):
<existing_spec>
${existingSpec}
</existing_spec>
`
    : ''
}
User request:
<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY the JSON spec wrapped in a single markdown code block:
\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "data": [{ "name": "source" }]
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    // Human message required for Bedrock to work properly
    ['human', 'Generate the Vega specification.'],
  ];
};

/**
 * Extra ES|QL guidance for Vega: same time-picker conventions as Lens, but no
 * implicit Lens framework, so time filtering must be explicit in the query.
 */
export const vegaEsqlAdditionalInstructions = `
You are generating an ES|QL query that will back a Kibana Vega visualization.

## Human-readable column aliases
Use human-readable column aliases in STATS/EVAL (e.g. \`Average Latency\` not \`avg_latency\`). Wrap multi-word aliases in backticks. These names become Vega field references, so keep them stable and descriptive.

## Avoid dots in column names
Vega treats a dot in a field name as nested-object access, so a column literally named \`geo.src\` breaks rendering. Whenever you group by or output a field whose name contains a dot, alias it to a dot-free, human-readable name (e.g. STATS \`Count\` = COUNT(*) BY \`Source\` = geo.src, \`Destination\` = geo.dest). Never leave a dotted field name in the output columns.

## Time picker compatibility
If a time field exists, make the query respond to the dashboard time picker by referencing \`?_tstart\` and \`?_tend\`.
- For time-series, bucket with \`BUCKET(<time field>, 75, ?_tstart, ?_tend)\`.
- For non-time-bucketed charts, filter with \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
Never hardcode absolute times or now()-based ranges.

## Small multiples
When the request implies small multiples / per-category panels, keep the grouping (category) column in the output alongside the metric and time/bucket columns so Vega can split marks by it. Avoid collapsing the grouping dimension away.`;
