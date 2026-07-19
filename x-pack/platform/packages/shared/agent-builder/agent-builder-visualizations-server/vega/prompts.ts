/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { VegaCatalogId, VegaDialect } from './dialect';
import { CANONICAL_ESQL_SOURCE_NAME } from './dialect';
import { catalogChartRules, getRawVegaChartType } from './chart_type_registry';

// Vega-specific ES|QL guidance; see issue #275519 for the time-filtering quirk.
export const vegaEsqlAdditionalInstructions = `
## Vega time-range filtering (required)

This query feeds a Vega chart, whose ES|QL data source only respects the time picker when the query filters rows on the raw source time field. Passing \`?_tstart\`/\`?_tend\` to \`BUCKET(...)\` alone sets the bucket extent but does NOT drop rows outside the selected range.

Therefore, for EVERY time-based chart — time series AND plain metrics/categorical:
- Always add an explicit row filter on the raw source time field: \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
- Use the RAW source time field (e.g. \`@timestamp\`) directly in both that WHERE filter and any \`BUCKET(...)\`. Never filter or bucket on a field produced by \`RENAME\` or \`EVAL\`; the time filter must reference the original source field so Kibana can bind the range to it.

## Field names for Vega

Vega interprets a dot in a field name as a nested-object path, but ES|QL result columns are flat, so a column whose name contains a dot (e.g. \`host.name\`) is misread and renders as "undefined".
- PRIMARY: RENAME every such dimension/metric column to a readable, dotless alias in the query, e.g. \`RENAME host.name AS host\` or \`RENAME geo.dest AS destination\`. The visualization will reference those aliases.
- Fallback only: if renaming is impossible, leave the dotted name in the result — do not invent escape syntax in ES|QL. Spec authoring (and normalize) will escape remaining dotted names.
- Do NOT rename the time field this way — keep filtering and bucketing on the raw source time field exactly as required above.`;

const formatColumns = (columns: EsqlEsqlColumnInfo[] | undefined): string => {
  if (!columns || columns.length === 0) {
    return 'No column information is available; infer fields from the ES|QL query.';
  }

  return columns.map((column) => `- "${column.name}" (${column.type})`).join('\n');
};

/**
 * Authoring guidance that applies to both Vega-Lite and allowlisted Raw Vega.
 * Dialect-specific encoding / diagram rules stay in each author prompt (and in
 * per-catalog `chartRules`).
 */
const sharedAuthoringRules = `COLOR:
- DEFAULT: use Kibana's theme-aware Elastic palette (adapts to light/dark mode). Prefer the theme binding — Raw Vega: ordinal color scale \`range: "category"\`; Vega-Lite: leave categorical color to the theme. Do NOT hardcode hex mark fills, config colors, or a custom palette unless the user asked for one.
- Never invent named color schemes (e.g. "pink", "pinks", "pinkblue") — stock Vega rejects unknown scheme names. Never use scheme "elastic", "category10", or "category20".
- Only for a continuous / quantitative color scale may you set a sequential "scheme" ("blues", "viridis").
- USER OVERRIDE: when the user explicitly asks for a color or palette (e.g. "shades of pink"), set the ordinal color scale \`range\` to an explicit hex array that matches the request (e.g. ["#FFB6D9", "#FF69B4", "#FF1493"]). Do not invent a scheme name for that ask.

MINIMAL SPEC:
- Keep the spec minimal: include only what is needed to render the requested chart. Do NOT add decorative marks or text that do not encode a real data field.

LAYOUT:
- DO NOT set top-level "width" or "height"; the system makes the chart fill its container.

TITLE RULES:
- Always set response "title" to a clear, self-explanatory visualization / dashboard panel title.
- NEVER put a top-level "title" on the "spec" — Kibana uses response "title" as the panel title; an in-spec title duplicates it inside the chart.
- Prefer the panel title over redundant axis or legend titles; NEVER duplicate the same wording across them.

DOTS IN FIELD NAMES:
- If a name in <columns> still contains a dot (e.g. "geo.dest"), backslash-escape every dot in "field" strings ("geo\\.dest") and use bracket access in expressions (datum['geo.dest']). Do not invent a rename here — the ES|QL query is already fixed.`;

const createVegaLiteAuthorPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  existingSpec,
  chartType,
  referenceExamples,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  existingSpec?: string;
  chartType?: SupportedChartType;
  referenceExamples?: string;
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

Author Vega-Lite ONLY — never raw Vega (v5). Use Vega-Lite for charts a standard Lens chart cannot express, for example faceted charts / small multiples, layered or combination charts (e.g. bars with an overlaid line), or scatter/bubble plots with an encoded size. If the request needs a diagram Vega-Lite cannot express (e.g. network, chord) and it is not an allowlisted Raw Vega chart the system already selected, build the closest chart Vega-Lite supports (such as a sorted bar chart of the top combinations) rather than attempting an unsupported diagram.
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

AXES:
- Long category labels (common on horizontal bar charts) truncate by default; set "axis": { "labelLimit": 150 } on that axis so the labels stay readable.
- Temporal axes: set "axis": { "labelAngle": 0, "tickCount": 8 } and let Vega auto-format the dates — do NOT rotate or hand-format date labels.
- When the panel title already conveys what an axis represents, set "title": null on that axis to drop the redundant axis title.

COLOR (Vega-Lite):
- Use the "color" ENCODING only for a meaningful categorical dimension; leave its scale to the theme (see COLOR above for defaults and user overrides).
- Single-series with no color request: omit color — the theme supplies the default series color.

LAYOUT & STYLE (Vega-Lite):
- Do NOT set fixed mark sizes (e.g. arc "outerRadius") that prevent the chart from filling its panel.
- SORT IN LAYERED SPECS: when a categorical axis is shared across layers, pre-sort rows in ES|QL (SORT … DESC) and set "sort": null on that encoding to avoid "conflicting sort properties" warnings.
- SHARED SCALES IN LAYERED SPECS: when multiple layers encode the same field on a shared scale (e.g. "color"), configure the "legend"/"axis"/"scale" on ONE layer only. Do NOT set "legend": null on one layer while another sets a legend for the same scale — conflicting per-layer settings trigger "Conflicting legend property" warnings.
- INDICATOR / BIG-NUMBER charts: stack the text marks in clearly separated vertical bands and NEVER center two large text marks on the same point. A single big value is safest; when adding a label or a secondary value (e.g. "Previous", "% change"), give each its own non-overlapping band and size fonts so the tallest mark cannot grow into its neighbours at any panel aspect ratio — overlapping text is hard to read.

FACETING / SMALL MULTIPLES:
- Build small multiples with the facet operator: a top-level "facet" (the field to split on) plus a "spec" (the per-cell chart). Put "columns" (the grid width, e.g. 4) as a SIBLING of "facet"/"spec" at the TOP LEVEL — NOT inside the "facet" object, where Vega-Lite silently ignores it and lays every cell out in one endless, unreadable row. Keep facet styling like "header" inside "facet".
- Container auto-sizing does NOT apply to faceted (or repeated / concat) specs, so set explicit "width" and "height" INSIDE the inner "spec" (per-cell size, e.g. "width": 150, "height": 100). This is the one case where you DO set width/height — on the inner unit spec, never at the top level.
- Only facet a low-cardinality field. If the field can take many values, pre-limit the ES|QL query (e.g. keep the top-N with SORT + LIMIT, or a WHERE filter) so the grid stays readable instead of producing hundreds of tiny cells.

${sharedAuthoringRules}
${referenceExamples ?? ''}
Your task is to author the visualization specification for the following request:

<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY a JSON object wrapped in a markdown code block. Use this shape — "title" is the Kibana visualization / panel title, and "spec" is the Vega-Lite specification (no top-level "title" inside "spec"):
\`\`\`json
{
  "title": "Concise panel title",
  "spec": {
    // Vega-Lite v6 specification
  }
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    // Human message required for Bedrock to work properly
    ['human', 'Author the visualization specification.'],
  ];
};

const createRawVegaAuthorPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  existingSpec,
  referenceExamples,
  additionalContext,
  catalogId,
}: {
  nlQuery: string;
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  existingSpec?: string;
  referenceExamples?: string;
  additionalContext?: string;
  catalogId: VegaCatalogId;
}): BaseMessageLike[] => {
  const esqlQueryJson = JSON.stringify(esqlQuery);
  const catalogEntry = getRawVegaChartType(catalogId);
  const chartFocus = catalogEntry
    ? `for an allowlisted chart (currently: ${catalogEntry.chartLabel})`
    : existingSpec
    ? 'that preserves the existing chart family'
    : 'for an allowlisted Raw Vega chart';

  return [
    [
      'system',
      `You are a Raw Vega (v5) visualization expert. Author a single valid Raw Vega specification ${chartFocus}.

Author Raw Vega ONLY — never Vega-Lite. Use "data" as an array, "marks" (plural), scales, and transforms. Do NOT use Vega-Lite "mark"/"encoding"/"facet".
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
1. Declare a Canonical ES|QL dataset named "${CANONICAL_ESQL_SOURCE_NAME}" whose url is { "%type%": "esql", "query": <the exact query below> }. Use the query verbatim — the system re-binds and validates it.
2. Put derived transforms on datasets that \`"source": "${CANONICAL_ESQL_SOURCE_NAME}"\` — do not invent a second ES|QL url.
3. The only fields you may reference are the result columns of this query: ${esqlQueryJson}
4. If the query uses ?_tstart / ?_tend, add "%timefield%": "@timestamp" on the Canonical source url.

Columns available in the data (reference these EXACT names):
<columns>
${formatColumns(columns)}
</columns>

STATIC DIAGRAM ONLY:
- Do NOT add custom interaction signals, and never call kibanaAddFilter / kibanaSetTimeFilter / other Kibana expression helpers.

${catalogChartRules(catalogId)}

${sharedAuthoringRules}
${referenceExamples ?? ''}
Your task is to author the visualization specification for the following request:

<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY a JSON object wrapped in a markdown code block. Use this shape — "title" is the Kibana visualization / panel title, and "spec" is the Raw Vega specification:
\`\`\`json
{
  "title": "Concise panel title",
  "spec": {
    // Raw Vega v5 specification (no top-level "title")
  }
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    ['human', 'Author the visualization specification.'],
  ];
};

export const createAuthorVegaSpecPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  existingSpec,
  chartType,
  referenceExamples,
  additionalContext,
  dialect = 'vega-lite',
  catalogId = 'none',
}: {
  nlQuery: string;
  esqlQuery: string;
  columns?: EsqlEsqlColumnInfo[];
  existingSpec?: string;
  chartType?: SupportedChartType;
  /** Pre-selected, pre-loaded reference-example block (see `chart_types/select_reference_examples`). */
  referenceExamples?: string;
  additionalContext?: string;
  dialect?: VegaDialect;
  catalogId?: VegaCatalogId;
}): BaseMessageLike[] => {
  if (dialect === 'vega') {
    return createRawVegaAuthorPrompt({
      nlQuery,
      esqlQuery,
      columns,
      existingSpec,
      referenceExamples,
      additionalContext,
      catalogId,
    });
  }
  return createVegaLiteAuthorPrompt({
    nlQuery,
    esqlQuery,
    columns,
    existingSpec,
    chartType,
    referenceExamples,
    additionalContext,
  });
};
