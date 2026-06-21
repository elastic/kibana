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
  dataUrl,
  existingSpec,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  columns: EsqlEsqlColumnInfo[] | undefined;
  /** The exact Kibana ES|QL `data.url` object the spec must use, as JSON. */
  dataUrl: string;
  existingSpec?: string;
  additionalContext?: string;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a Kibana Vega-Lite visualization expert. Author a single Vega-Lite v5 specification for a custom visualization that Kibana Lens cannot express (for example small multiples / faceting, repeated layers, or bespoke encodings).

Prefer Lens for ordinary charts; you are being used precisely because the requested visualization is NOT a standard Lens chart. Lean into Vega-Lite features such as "facet", "repeat", "concat", "layer", and custom transforms when they serve the request.

SCHEMA RULES:
- The top-level "$schema" MUST be "https://vega.github.io/schema/vega-lite/v5.json".
- Produce Vega-Lite (not raw Vega). Use "mark"/"encoding", or composition operators ("facet", "repeat", "layer", "concat", "vconcat", "hconcat").

DATA RULES:
- Use EXACTLY this top-level "data" object (Kibana resolves it against Elasticsearch via ES|QL); do not add, rename, or invent other data sources:
<data>
{ "url": ${dataUrl} }
</data>
- Bind encodings ONLY to the columns produced by the ES|QL query (listed below). Use the column names verbatim, including spaces and capitalization.
- Choose Vega-Lite field "type" ("quantitative", "temporal", "nominal", "ordinal") appropriate to each column's Elasticsearch type.
- DOTS IN FIELD NAMES: Vega-Lite treats an unescaped dot in a field name as nested-object access, but ES|QL columns are flat. So whenever a column name contains a dot (e.g. "geo.src"), you MUST backslash-escape every dot in EVERY reference to it — in "field", "groupby", and "sort.field" — e.g. write "field": "geo\\.src" (not "geo.src"). Do NOT escape dots inside "filter"/"expr" expression strings.

ES|QL query backing the data:
<esql>
${esqlQuery}
</esql>

Available result columns:
<columns>
${formatColumns(columns)}
</columns>

${
  existingSpec
    ? `Existing spec to modify (keep what still applies, change only what the request asks for):
<existing_spec>
${existingSpec}
</existing_spec>
`
    : ''
}

DESIGN RULES:
- Make the chart self-explanatory: include a concise "title" and clear axis/legend titles.
- SIZING: "width": "container" / "height": "container" works ONLY for single-view and layered specs — set it there (and do NOT add fixed pixel sizes) so the chart fills the panel. For composed specs ("facet"/"repeat"/"concat") container is NOT supported, so OMIT "container" entirely and set explicit numeric "width"/"height" on the inner "spec" (e.g. a fixed height per small-multiple row). Prefer single-view or "layer" designs when you want the chart to fill the panel.
- ORDERED DISCRETE CHANNELS: when binding a discrete field to "opacity" or "size", set its "type" to "ordinal" and give it an explicit order (a "sort" array, or a "scale.domain"); Vega-Lite warns ("should not be used with an unsorted discrete field") when "opacity"/"size" is bound to an unsorted nominal field.
- SHARED SCALES IN LAYERED SPECS: layers share ONE scale (and legend) per channel by default. This causes "Conflicting scale property"/"Conflicting legend property" warnings when layers disagree. Follow these rules:
  - When layers SHARE a channel (the same positional "x"/"y" axis, or color by the same field), define that scale and legend EXACTLY ONCE on the top-level "encoding". Do NOT also set a different "scale" (e.g. a different "domain") or a conflicting "legend" (e.g. "legend": null on one layer and a legend object on another) inside the individual layers — let them inherit the shared definition.
  - Only when layers genuinely encode DIFFERENT fields on the same channel, make that channel independent with a top-level "resolve", e.g. "resolve": { "scale": { "color": "independent" }, "legend": { "color": "independent" } }. Do NOT make a shared positional axis independent — that misaligns the layers.
- Keep the spec minimal: only include properties needed to render the requested visualization.

User request:
<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY the JSON spec wrapped in a single markdown code block:
\`\`\`json
{
  // your Vega-Lite spec here
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    // Human message required for Bedrock to work properly
    ['human', 'Generate the Vega-Lite specification.'],
  ];
};

/**
 * Extra ES|QL guidance for Vega: same time-picker conventions as Lens, but no
 * implicit Lens framework, so time filtering must be explicit in the query.
 */
export const vegaEsqlAdditionalInstructions = `
You are generating an ES|QL query that will back a Kibana Vega-Lite visualization.

## Human-readable column aliases
Use human-readable column aliases in STATS/EVAL (e.g. \`Average Latency\` not \`avg_latency\`). Wrap multi-word aliases in backticks. These names become Vega encoding fields, so keep them stable and descriptive.

## Avoid dots in column names
Vega-Lite treats a dot in a field name as nested-object access, so a column literally named \`geo.src\` breaks rendering. Whenever you group by or output a field whose name contains a dot, alias it to a dot-free, human-readable name (e.g. STATS \`Count\` = COUNT(*) BY \`Source\` = geo.src, \`Destination\` = geo.dest). Never leave a dotted field name in the output columns.

## Time picker compatibility
If a time field exists, make the query respond to the dashboard time picker by referencing \`?_tstart\` and \`?_tend\`.
- For time-series, bucket with \`BUCKET(<time field>, 75, ?_tstart, ?_tend)\`.
- For non-time-bucketed charts, filter with \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
Never hardcode absolute times or now()-based ranges.

## Small multiples
When the request implies small multiples / faceting, keep the grouping (category) column in the output alongside the metric and time/bucket columns so Vega can facet on it. Avoid collapsing the facet dimension away.`;
