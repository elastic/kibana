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
import { CANONICAL_ESQL_SOURCE_NAME, RADAR_MIN_KEYS, SANKEY_MIN_FLOWS } from './dialect';

// Vega-specific ES|QL guidance; see issue #275519 for the time-filtering quirk.
export const vegaEsqlAdditionalInstructions = `
## Vega time-range filtering (required)

This query feeds a Vega chart, whose ES|QL data source only respects the time picker when the query filters rows on the raw source time field. Passing \`?_tstart\`/\`?_tend\` to \`BUCKET(...)\` alone sets the bucket extent but does NOT drop rows outside the selected range.

Therefore, for EVERY time-based chart — time series AND plain metrics/categorical:
- Always add an explicit row filter on the raw source time field: \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
- Use the RAW source time field (e.g. \`@timestamp\`) directly in both that WHERE filter and any \`BUCKET(...)\`. Never filter or bucket on a field produced by \`RENAME\` or \`EVAL\`; the time filter must reference the original source field so Kibana can bind the range to it.

## Field names for Vega

Vega interprets a dot in a field name as a nested-object path, but ES|QL result columns are flat, so a column whose name contains a dot (e.g. \`host.name\`) is misread and renders as "undefined".
- RENAME every such column to a readable, dotless alias in the query, e.g. \`RENAME host.name AS host\` or \`RENAME geo.dest AS destination\`, and reference the alias in the spec. Prefer this over leaving dotted names for the renderer to escape.
- This applies to dimension/metric columns only. Do NOT rename the time field this way — keep filtering and bucketing on the raw source time field exactly as required above.`;

/** Extra ES|QL instructions when authoring a Sunburst Parent–child table. */
export const sunburstEsqlAdditionalInstructions = `
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
- Keep column names exactly \`id\`, \`parent\`, \`name\`, and \`value\` when possible.
- Still obey the Vega time-range and dotted-field rules above when the index is time-based.`;

/** Extra ES|QL instructions when authoring a Radar key/value table. */
export const radarEsqlAdditionalInstructions = `
## Radar / spider rows (required)

This query feeds a Raw Vega radar chart. Emit a flat table with:
- \`key\`: axis / spoke label (keyword/string) — the multivariate dimension
- \`value\`: numeric measure on that axis (COUNT, SUM, AVG, …)
- \`series\` (optional): series / group label when comparing multiple radars on one chart

CRITICAL — radar integrity:
- At least ${RADAR_MIN_KEYS} distinct \`key\` values (a radar with fewer spokes is not useful).
- \`value\` must be numeric for every row.
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
  **zero rows** and the chart goes blank (Infinite extent warnings).
- Still obey the Vega time-range and dotted-field rules above when the index is time-based.`;

/** Extra ES|QL instructions when authoring a Sankey flow table. */
export const sankeyEsqlAdditionalInstructions = `
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
\`\`\`

Rules:
- Still obey the Vega time-range and dotted-field rules above when the index is time-based.`;

const formatColumns = (columns: EsqlEsqlColumnInfo[] | undefined): string => {
  if (!columns || columns.length === 0) {
    return 'No column information is available; infer fields from the ES|QL query.';
  }

  return columns.map((column) => `- "${column.name}" (${column.type})`).join('\n');
};

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
- Keep the spec minimal: include only what is needed to render the requested chart. Do NOT add decorative text layers with a constant "value" (e.g. a center label that just repeats a word); a text layer must encode a real field.

AXES:
- Long category labels (common on horizontal bar charts) truncate by default; set "axis": { "labelLimit": 150 } on that axis so the labels stay readable.
- Temporal axes: set "axis": { "labelAngle": 0, "tickCount": 8 } and let Vega auto-format the dates — do NOT rotate or hand-format date labels.
- When the panel title already conveys what an axis represents, set "title": null on that axis to drop the redundant axis title.

COLOR:
- Kibana applies a theme-aware Elastic palette and adapts chart colors to the active light/dark theme. Do NOT hardcode colors: no hex values, no "config" block setting mark/axis/text colors, and no "mark": { "color": … } — hardcoding overrides the theme and breaks dark mode.
- Use the "color" ENCODING only to distinguish a meaningful categorical dimension, and leave its scale to the theme: do NOT set a "scheme", "range", or hand-authored "domain" for categorical color.
- Only for a quantitative color encoding may you set a sequential "scheme" ("blues", "viridis"), since there is no themed default for continuous scales.
- Single-series charts need no color at all — the theme supplies the default series color.

TITLE RULES:
- Always set "title" to a clear, self-explanatory visualization / dashboard panel title.
- Prefer the panel title over redundant axis titles.
- NEVER duplicate information across the panel title and axis titles.

LAYOUT & STYLE RULES:
- DO NOT set top-level "width" or "height"; the system makes the chart fill its container. Do NOT set fixed mark sizes (e.g. arc "outerRadius") that prevent the chart from filling its panel.
- SORT IN LAYERED SPECS: when a categorical axis is shared across layers, pre-sort rows in ES|QL (SORT … DESC) and set "sort": null on that encoding to avoid "conflicting sort properties" warnings.
- SHARED SCALES IN LAYERED SPECS: when multiple layers encode the same field on a shared scale (e.g. "color"), configure the "legend"/"axis"/"scale" on ONE layer only. Do NOT set "legend": null on one layer while another sets a legend for the same scale — conflicting per-layer settings trigger "Conflicting legend property" warnings.
- INDICATOR / BIG-NUMBER charts: stack the text marks in clearly separated vertical bands and NEVER center two large text marks on the same point. A single big value is safest; when adding a label or a secondary value (e.g. "Previous", "% change"), give each its own non-overlapping band and size fonts so the tallest mark cannot grow into its neighbours at any panel aspect ratio — overlapping text is hard to read.

FACETING / SMALL MULTIPLES:
- Build small multiples with the facet operator: a top-level "facet" (the field to split on) plus a "spec" (the per-cell chart). Put "columns" (the grid width, e.g. 4) as a SIBLING of "facet"/"spec" at the TOP LEVEL — NOT inside the "facet" object, where Vega-Lite silently ignores it and lays every cell out in one endless, unreadable row. Keep facet styling like "header" inside "facet".
- Container auto-sizing does NOT apply to faceted (or repeated / concat) specs, so set explicit "width" and "height" INSIDE the inner "spec" (per-cell size, e.g. "width": 150, "height": 100). This is the one case where you DO set width/height — on the inner unit spec, never at the top level.
- Only facet a low-cardinality field. If the field can take many values, pre-limit the ES|QL query (e.g. keep the top-N with SORT + LIMIT, or a WHERE filter) so the grid stays readable instead of producing hundreds of tiny cells.

DOTS IN FIELD NAMES:
- Vega treats an unescaped dot in a field name as nested-object access, but ES|QL columns are flat. For a column whose name contains a dot (e.g. "geo.dest"), backslash-escape every dot in "field" strings ("geo\\.dest") and use bracket access in expressions (datum['geo.dest']).
${referenceExamples ?? ''}
Your task is to author the visualization specification for the following request:

<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY a JSON object wrapped in a markdown code block. Use this shape — "title" is the Kibana visualization / panel title, and "spec" is the Vega-Lite specification:
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

const catalogChartRules = (catalogId: VegaCatalogId): string => {
  switch (catalogId) {
    case 'sankey':
      return `SANKEY / FLOW RULES:
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
- STATIC DIAGRAM ONLY: do NOT add groupSelector / groupHover click signals, kibanaAddFilter, or "show all" buttons.
- DO NOT set top-level "width", "height", or root "encode" x/y; the panel sizes the view.
- COLOR: on the ordinal color scale set range: "category" (Kibana binds this to the theme palette). Never category10/category20/hex, and never scheme "elastic" (that name is not valid in stock Vega).
- Y SCALE (critical — wrong domain blanks the chart): MUST be
  \`{ "name": "y", "type": "linear", "range": "height", "nice": true, "zero": true, "domain": { "data": "nodes", "field": "y1" } }\`.
  Never \`domain: [0, 1]\` or any fixed numeric interval — stack totals are real counts/sums, not unit fractions.
- EXPRESSIONS: always lowercase helpers — scale(, bandwidth(, domain(, range(. Never Scale( / Bandwidth(.
- TOOLTIPS: ASCII only in signal strings (use " -> ", not unicode arrows).`;
    case 'radar':
      return `RADAR / SPIDER RULES:
- Expect a key / value table (optional series). Need ≥${RADAR_MIN_KEYS} distinct keys.
- Scales: angular (point, domain = key, range [-PI, PI]) and radial (linear, domain = value, range [0, radius]).
- MARKS ARRAY SHAPE (critical — malformed marks blank the chart):
  - Top-level "marks" is a FLAT array of sibling mark objects: [group|line, rule, text, line, …].
  - The faceted series "group" is ONE object whose nested "marks" contains ONLY the closed polygon line(s).
  - Grid "rule", spoke "text", and outer "line" are SIBLINGS of that group — never extra properties on the group after its nested marks close.
  - Copy the reference example mark list structure; do not merge siblings into one object.
- Marks content: grid rules + labels from aggregated keys; closed polygon via line marks with interpolate "linear-closed".
  - Multi-series: facet the Canonical source by series (groupby series) and draw one closed line per facet.
  - Single-series (no series column): one closed line from "${CANONICAL_ESQL_SOURCE_NAME}" (no facet required).
- RESPONSIVE LAYOUT (required — fill and center the Kibana panel):
  - NEVER set top-level "encode" x/y (official Vega radar does this; in Kibana it shoves the chart into a corner).
  - NEVER use autosize "none" — Kibana disables panel sizing and the chart goes blank.
  - Center in EVERY mark signal: width/2 + …, height/2 + … (same idea as sunburst arc x/y).
  - radius signal: min(width, height) / 2 - 40 (reserves space for spoke labels inside the panel).
  - Labels at width/2 + (radius + 8) * cos(…), height/2 + (radius + 8) * sin(…).
  - Prefer short key labels (LIMIT axes); avoid large fontSize.
- EXPRESSIONS: always lowercase helpers — scale(, cos(, sin(. Never Scale(.
- STATIC DIAGRAM ONLY: do NOT add custom interaction signals, and never call kibanaAddFilter / kibanaSetTimeFilter / other Kibana expression helpers.
- DO NOT set top-level "width" or "height"; the panel sizes the view.
- COLOR: for categorical series set range: "category" (Kibana theme palette); never category10/hex or scheme "elastic".`;
    case 'sunburst':
    default:
      return `SUNBURST RULES:
- Expect a Parent–child table with id / parent / name / value (or clear aliases present in <columns>). Exactly one root (parent null); every other parent id must exist as an id row — otherwise stratify fails with "missing: <id>" / "multiple roots" and partition cannot run.
- Pipeline: source → stratify(key=id, parentKey=parent) → partition(field=value) → arc marks. Put both transforms on the same derived dataset that sources "${CANONICAL_ESQL_SOURCE_NAME}".
- STATIC DIAGRAM ONLY: do NOT add custom interaction signals, and never call kibanaAddFilter / kibanaSetTimeFilter / other Kibana expression helpers.
- Built-in width/height signals for layout (e.g. partition size, arc x/y) are fine.
- DO NOT set top-level "width" or "height"; the panel sizes the view.
- COLOR: for categorical colors prefer range: "category" (Kibana theme palette); sequential schemes ("blues") are OK only for continuous depth/value. Never scheme "elastic".`;
  }
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
  const chartLabel =
    catalogId === 'radar'
      ? 'radar / spider'
      : catalogId === 'sankey'
      ? 'sankey / flow'
      : 'sunburst / hierarchy';

  return [
    [
      'system',
      `You are a Raw Vega (v5) visualization expert. Author a single valid Raw Vega specification for an allowlisted chart (currently: ${chartLabel}).

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

${catalogChartRules(catalogId)}

DOTS IN FIELD NAMES:
- Escape dots in field strings ("geo\\.dest") and use bracket access in expressions (datum['geo.dest']).
${referenceExamples ?? ''}
Your task is to author the visualization specification for the following request:

<user_query>
${nlQuery}
</user_query>

IMPORTANT: Return ONLY the JSON specification wrapped in a markdown code block:
\`\`\`json
{
  // your Raw Vega specification here
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
  /** Pre-selected, pre-loaded reference-example block (see `reference_examples`). */
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
