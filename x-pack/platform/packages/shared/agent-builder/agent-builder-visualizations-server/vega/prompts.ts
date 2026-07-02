/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Vega-specific ES|QL guidance appended to the shared instructions when
 * generating the query for a Vega chart.
 *
 * Kibana's Vega ES|QL renderer only *filters* rows by the time picker when the
 * query filters on the raw source time field itself; binding `?_tstart`/`?_tend`
 * inside `BUCKET(...)` only sets the bucket extent and does NOT drop rows outside
 * the selected range (see issue #275519). So, unlike Lens (which applies the time
 * range for us), every time-based Vega query must filter its own rows and must do
 * so on the original source field — not a `RENAME`/`EVAL`-derived one.
 */
export const vegaEsqlAdditionalInstructions = `
## Vega time-range filtering (required)

This query feeds a Vega chart, whose ES|QL data source only respects the time picker when the query filters rows on the raw source time field. Passing \`?_tstart\`/\`?_tend\` to \`BUCKET(...)\` alone sets the bucket extent but does NOT drop rows outside the selected range.

Therefore, for EVERY time-based chart — time series AND plain metrics/categorical:
- Always add an explicit row filter on the raw source time field: \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
- Use the RAW source time field (e.g. \`@timestamp\`) directly in both that WHERE filter and any \`BUCKET(...)\`. Never filter or bucket on a field produced by \`RENAME\` or \`EVAL\`; the time filter must reference the original source field so Kibana can bind the range to it.`;

/**
 * Describe the result columns of the backing ES|QL query so the model binds
 * encodings to real field names and types instead of guessing.
 */
const formatColumns = (columns: EsqlEsqlColumnInfo[] | undefined): string => {
  if (!columns || columns.length === 0) {
    return 'No column information is available; infer fields from the ES|QL query.';
  }

  return columns.map((column) => `- "${column.name}" (${column.type})`).join('\n');
};

export const createAuthorVegaSpecPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  existingSpec,
  chartType,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  existingSpec?: string;
  chartType?: SupportedChartType;
  additionalContext?: string;
}): BaseMessageLike[] => {
  const esqlQueryJson = JSON.stringify(esqlQuery);
  const chartTypeHint = chartType
    ? `\nSuggested chart style: "${chartType}". Treat it as a hint for the visual form; adapt if the data or request calls for something else.`
    : '';

  return [
    [
      'system',
      `You are a Vega-Lite visualization expert. Author a single valid Vega-Lite (v6) specification for the user's request.

Author Vega-Lite ONLY — never raw Vega (v5). Use Vega-Lite for charts a standard Lens chart cannot express, for example faceted charts / small multiples, layered or combination charts (e.g. bars with an overlaid line), or scatter/bubble plots with an encoded size. If the request needs a diagram Vega-Lite cannot express (e.g. Sankey / flow, network, chord), build the closest chart Vega-Lite supports (such as a sorted bar chart of the top combinations) rather than attempting an unsupported diagram.
${chartTypeHint}
${
  existingSpec
    ? `Existing specification to modify (keep what still applies, change only what the request asks for):
<existing_specification>
${existingSpec}
</existing_specification>
`
    : ''
}
DATA SOURCE RULES:
1. Bind the data with Kibana's inline ES|QL source: a top-level "data": { "url": { "%type%": "esql", "query": <the exact query below> } }. Use the query verbatim — do not modify it; the system re-binds and validates it.
2. The spec is built around this ES|QL query; its result columns are the only fields you may reference in encodings: ${esqlQueryJson}
3. Reference each column by its exact name as produced by the query. If the query uses the time-picker params (?_tstart / ?_tend), add "%timefield%": "@timestamp" to the url so Kibana binds the time range.

Columns available in the data (reference these EXACT names):
<columns>
${formatColumns(columns)}
</columns>

ENCODING TYPES:
- Pick the correct "type" for every encoded field: "nominal" (unordered categories), "ordinal" (ordered categories), "quantitative" (continuous numbers), "temporal" (dates/times).

CHART CHOICE:
- PIE/DONUT: do NOT use "arc" marks. Prefer a sorted horizontal bar chart (it is easier to read and compare); pre-sort the categories in the ES|QL query (SORT … DESC).
- Keep the spec minimal: include only what is needed to render the requested chart. Do NOT add decorative text layers with a constant "value" (e.g. a center label that just repeats a word); a text layer must encode a real field.

COLOR:
- Use "color" only for a meaningful dimension, and do NOT hand-author a "domain"; let it derive from the data. For categorical fields prefer a built-in scheme; for quantitative fields a sequential "scheme" ("blues", "viridis") is fine.

LAYOUT & STYLE RULES:
- DO NOT set top-level "width" or "height"; the system makes the chart fill its container. Do NOT set fixed mark sizes (e.g. arc "outerRadius") that prevent the chart from filling its panel.
- Provide a clear, self-explanatory "title"; prefer it over redundant axis titles.
- SORT IN LAYERED SPECS: when a categorical axis is shared across layers, pre-sort rows in ES|QL (SORT … DESC) and set "sort": null on that encoding to avoid "conflicting sort properties" warnings.
- SHARED SCALES IN LAYERED SPECS: when multiple layers encode the same field on a shared scale (e.g. "color"), configure the "legend"/"axis"/"scale" on ONE layer only. Do NOT set "legend": null on one layer while another sets a legend for the same scale — conflicting per-layer settings trigger "Conflicting legend property" warnings.
- INDICATOR / BIG-NUMBER charts: stack the text marks in clearly separated vertical bands and NEVER center two large text marks on the same point. A single big value is safest; when adding a label or a secondary value (e.g. "Previous", "% change"), give each its own non-overlapping band and size fonts so the tallest mark cannot grow into its neighbours at any panel aspect ratio — overlapping text is hard to read.

FACETING / SMALL MULTIPLES:
- Build small multiples with the facet operator: a top-level "facet" (the field to split on) plus a "spec" (the per-cell chart). Put "columns" (the grid width, e.g. 4) as a SIBLING of "facet"/"spec" at the TOP LEVEL — NOT inside the "facet" object, where Vega-Lite silently ignores it and lays every cell out in one endless, unreadable row. Keep facet styling like "header" inside "facet".
- Container auto-sizing does NOT apply to faceted (or repeated / concat) specs, so set explicit "width" and "height" INSIDE the inner "spec" (per-cell size, e.g. "width": 150, "height": 100). This is the one case where you DO set width/height — on the inner unit spec, never at the top level.
- Only facet a low-cardinality field. If the field can take many values, pre-limit the ES|QL query (e.g. keep the top-N with SORT + LIMIT, or a WHERE filter) so the grid stays readable instead of producing hundreds of tiny cells.

DOTS IN FIELD NAMES:
- Vega treats an unescaped dot in a field name as nested-object access, but ES|QL columns are flat. For a column whose name contains a dot (e.g. "geo.dest"), backslash-escape every dot in "field" strings ("geo\\.dest") and use bracket access in expressions (datum['geo.dest']).

Your task is to author the visualization specification for the following request:

<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY the JSON specification wrapped in a markdown code block:
\`\`\`json
{
  // your Vega-Lite specification here
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    // Human message required for Bedrock to work properly
    ['human', 'Author the visualization specification.'],
  ];
};
