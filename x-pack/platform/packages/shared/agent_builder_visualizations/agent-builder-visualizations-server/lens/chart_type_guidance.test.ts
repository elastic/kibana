/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartTypeConfigPromptContent,
  getChartTypeReviewPromptContent,
  getChartTypeSelectionPromptContent,
} from './chart_type_guidance';

describe('chart type guidance', () => {
  it('compiles selection, config, and review prompt content', () => {
    expect({
      selection: getChartTypeSelectionPromptContent(),
      review: getChartTypeReviewPromptContent(),
      config: Object.fromEntries(
        Object.values(SupportedChartType).map((chartType) => [
          chartType,
          getChartTypeConfigPromptContent(chartType),
        ])
      ),
    }).toMatchInlineSnapshot(`
      Object {
        "config": Object {
          "data_table": "",
          "gauge": "CHART-SPECIFIC RULES FOR GAUGE:
      - Always omit the optional 'min' and 'max' fields from the final configuration.
      - Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.
      - Only include goal/target-related fields when the user explicitly asks for a goal or threshold.",
          "heatmap": "",
          "metric": "CHART-SPECIFIC RULES FOR METRIC:
      - Do not set a panel title on a metric — it duplicates the painted metric name. Omit title so the metric is titleless.
      - A single primary metric is valid, but when meaningful, enrich it from the same ES|QL with a trend background or secondary metric. Never invent another index or field.
      - Use \`type: \\"bar\\"\` only for meaningful progress-to-max.
      - For trend/delta secondary metrics, hide the label with \`styling.secondary.label.visible: false\` and omit \`label\`. Show labels only for distinct named measures.",
          "mosaic": "",
          "pie": "CHART-SPECIFIC RULES FOR PIE:
      - Omit \`legend.visibility\` (or set \`auto\`). Do not set \`visible\` or \`hidden\` — slice labels carry the categories.",
          "region_map": "",
          "tag_cloud": "",
          "treemap": "",
          "waffle": "",
          "xy": "CHART-SPECIFIC RULES FOR XY:
      - For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.
      - Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.
      - For area series, set \`styling.areas.fill: \\"gradient\\"\` rather than solid.
      - Default legend rules: Place outside at the bottom. Omit legend.layout.type. Do not set legend.visibility unless legend statistics are set - then set it to \\"visible\\".
      - If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.",
        },
        "review": "CHART REVIEW RULES:
      TITLE RULES:
      - Omit the 'title' field when the chart already displays the information within itself (e.g. metric, gauge, tagcloud, waffle charts show their value and label directly).
      - When a title is needed, make it self-explanatory and exhaustive so that axis titles become unnecessary.
      - NEVER duplicate information across the chart title, axis titles, and metric labels.
      NUMBER FORMAT RULES:
      - Always apply a 'format' to columns when the data has a well-known unit:
        - CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }
        - Bytes (disk, memory, network volume) → { type: \\"bytes\\", decimals: 1 }
        - Bits (network throughput) → { type: \\"bits\\", decimals: 1 }
        - Durations (response time, latency) → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\")
      - When column names or the user query hint at a unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"), infer the correct format even if the user did not explicitly ask for it.
      - Do NOT apply a format when the metric is a plain count, rate, or when the unit is ambiguous.
      ### shared
      COLOR PALETTE RULES:

      - Never introduce or switch to legacy palette IDs (\`eui_amsterdam\`, \`kibana_v7_legacy\`, or \`elastic_brand_2023\`).
      - Drop invented static hex colors, per-value \`color_code\` mappings, and legacy palettes unless the user asked for those colors. Omit \`color\` so Lens uses its default.

      DEFAULT POLICY:
      - Prefer Lens defaults for unknown-scale data: use \`color: { type: \\"auto\\" }\` or omit \`color\` when Lens can calculate better thresholds at render time.
      - Generate explicit numeric \`steps\` only when the chart-specific rules allow it, or when the user asks for a custom palette or exact thresholds.
      - Do not color neutral data with no useful color meaning.
      - Chart-specific coloring rules below override this policy where they differ.

      DYNAMIC STEPS — mechanics for when the rules above call for explicit \`steps\`:
      - Pick exactly ONE dynamic palette from the list below: \\"Status\\" for threshold bands, \\"Temperature\\" for intensity, \\"Complementary\\" for divergence, \\"Negative\\"/\\"Positive\\" for adverse/favorable values, or \\"Cool\\"/\\"Warm\\"/\\"Gray\\" for neutral magnitude.
      - Step count by chart type: metric: 3, gauge: 4, heatmap and data_table: 5. Every \`steps[*].color\` hex MUST come from the 5-stop preview line below; for 3- and 4-step charts use the first 3 or 4 colors.
      - Step thresholds are data values, not display labels; keep them in the same unit and scale as the metric column. For rates, do not assume per-second thresholds unless the ES|QL query computes per-second values.
      - Keep palette order by default; to reverse, reverse the \`steps\` colors yourself. There is no \`reverse\` field.

      Available dynamic palettes (canonical 5-stop previews from the Lens UI palette picker):
      - Complementary: #61a2ff, #accefe, #f6f9fc, #f0d47f, #eaae01
      - Cool: #d6e5ff, #bad5ff, #9fc4ff, #82b3ff, #61a2ff
      - Gray: #c2cbdb, #92a0b8, #667690, #3f4e67, #1d2a3e
      - Positive: #d4efe6, #b1e4d1, #8cd9bb, #62cea6, #24c292
      - Negative: #fcdfdd, #fec4bf, #feaaa2, #fb8f86, #f6726a
      - Status: #24c292, #aee8d2, #fcd883, #ffc9c2, #f6726a
      - Temperature: #61a2ff, #cfe1ff, #f6f9fc, #ffd4cf, #f6726a
      - Warm: #ffdbd6, #ffc2ba, #ffa89f, #fb8d84, #f6726a
      ### metric
      METRIC COLORING RULES:
      - Metric placement: set \`apply_color_to: \\"value\\"\` only together with a color config; do not color the background unless the user asks. When not coloring, omit both \`color\` and \`apply_color_to\` — \`apply_color_to\` without a color makes Lens tint the value with a default green.
      - For clearly bounded metrics, use explicit 3-band \`steps\` by default. Examples: percent, ratio, CPU/memory/disk utilization, error rate, success rate, or SLO compliance.
      - Metric charts use 3 bands; prefer \\"Status\\", \\"Negative\\", \\"Positive\\", or \\"Temperature\\" when thresholds have semantic meaning.
      - For bounded adverse metrics like error rate %, higher values are worse; use a status/adverse palette with thresholds in the same percent scale as the metric output.
      - For unbounded values (raw counts, bytes, durations, throughput, rates with unknown scale), fall back to the default policy: \`color: { type: \\"auto\\" }\` or no color.
      - Do not set a panel title on a metric — it duplicates the painted metric name. Omit title so the metric is titleless.
      - A single primary metric is valid, but when meaningful, enrich it from the same ES|QL with a trend background or secondary metric. Never invent another index or field.
      - Use \`type: \\"bar\\"\` only for meaningful progress-to-max.
      - For trend/delta secondary metrics, hide the label with \`styling.secondary.label.visible: false\` and omit \`label\`. Show labels only for distinct named measures.
      Critical:
      - A title on a metric is a critical issue — clear it.
      - Invented static colors or BACKGROUND fills on the primary metric are a critical issue.
      Suggestions:
      - When a trend or status could be shown (time series available, or a clear threshold/comparison) and the panel is a lone number on white, suggest adding a sparkline or secondary. A single number with nothing to compare or trend is fine.
      ### gauge
      GAUGE COLORING RULES:
      - Gauge default: mirror Lens with \`range: \\"percentage\\"\` and exactly 4 bands: \`0 <= value < 25\`, \`25 <= value < 50\`, \`50 <= value < 75\`, \`75 <= value <= 100\`.
      - If the user asks for a non-default gauge palette, keep those same percentage bands and only change the step colors.
      - Do not invent absolute gauge thresholds from units like bytes, requests, or rates unless the user gave those thresholds.
      - Always omit the optional 'min' and 'max' fields from the final configuration.
      - Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.
      - Only include goal/target-related fields when the user explicitly asks for a goal or threshold.
      ### xy

      - For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.
      - Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.
      - For area series, set \`styling.areas.fill: \\"gradient\\"\` rather than solid.
      - Default legend rules: Place outside at the bottom. Omit legend.layout.type. Do not set legend.visibility unless legend statistics are set - then set it to \\"visible\\".
      - If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.
      Critical:
      - A solid area fill on the painted chart is a critical issue.
      - A visible legend on a one-series categorical chart is a critical issue.
      - Invented static or custom series colors (explicit hex or \`type: \\"static\\"\`) are a critical issue.
      ### heatmap
      HEATMAP COLORING RULES:
      - Lens binds heatmap colors to the data automatically using the \\"Temperature\\" palette; keep that default (omit \`color\` or use \`color: { type: \\"auto\\" }\`) and generate explicit \`steps\` only when the user requests a custom palette or gives thresholds.
      ### data_table
      DATA_TABLE COLORING RULES:
      - Datatable placement: prefer \`apply_color_to: \\"badge\\"\`; avoid cell background or text coloring unless the user asks.
      - Numeric datatable columns: when coloring is useful, use \`apply_color_to: \\"badge\\"\` with \`color: { type: \\"auto\\" }\` so Lens computes stops from table data.
      - Categorical datatable columns: when coloring is useful, use \`color: { mode: \\"categorical\\", palette: \\"<palette id>\\", mapping: [] }\` so Lens assigns colors to actual values.

      COLORING MODE — choose based on the column type:
      - Only add color when it adds meaning, improves readability, highlights status/severity, or the user asks for colored values.
      - Numeric columns → when coloring is useful, use \`color: { type: \\"auto\\" }\` by default; use \`color: { type: \\"dynamic\\", range, steps: [...] }\` only when explicit steps are allowed.
      - Keyword / text columns → when coloring is useful, use \`color: { mode: \\"categorical\\", palette: \\"<palette id>\\", mapping: [] }\`.
      - NEVER apply categorical mapping to a numeric column or dynamic palette steps to a keyword column.
      - NEVER use the deprecated \`type: \\"legacy_dynamic\\"\`.

      CATEGORICAL MAPPING — pick a palette by id:
      - Set \`color: { mode: \\"categorical\\", palette: \\"<palette id>\\", mapping: [] }\` and let Lens auto-assign a distinct color per distinct value at render time.
      - The \`palette\` value MUST be one of the categorical palette ids listed below verbatim (e.g. \`\\"default\\"\`, \`\\"severity\\"\`).
      - Leave \`mapping: []\` by default. Only define explicit \`mapping[]\` entries when the user names specific values to color.
      - When the user does name explicit values, use \`color: { type: \\"color_code\\", value: \\"#hex\\" }\` for each entry, drawing the hex from one of the palettes below.

      Available categorical palettes (5-color preview of each palette from the Lens UI color-mapping picker; pass the id, not the name):
      - default (Elastic): #16C5C0, #A6EDEA, #61A2FF, #BFDBFF, #EE72A6
      - elastic_line_optimized (Elastic (line optimized)): #16C5C0, #61A2FF, #EE72A6, #EAAE01, #F6726A
      - severity (Severity): #24C292, #B5E5F2, #FCD883, #FF995E, #EE4C48
      Critical:
      - Invented custom cell or text colors are a critical issue.
      ### pie

      - Omit \`legend.visibility\` (or set \`auto\`). Do not set \`visible\` or \`hidden\` — slice labels carry the categories.
      Critical:
      - Invented per-slice or custom colors are a critical issue.
      - A pie legend set to visible or hidden is a critical issue — leave legend.visibility omitted or auto.",
        "selection": "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:
      - metric: Displays a single numeric value, KPI, or aggregate statistic (count, sum, average) with an optional trend line. Choose for single numbers without ranges or targets.
      - gauge: Displays a single metric within a range with optional min/max/goal bounds. Choose when showing progress toward a goal or performance against thresholds (e.g. \\"CPU usage as a gauge\\", \\"sales target progress\\").
      - xy: Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. \\"request count over time\\", \\"average CPU over time\\", \\"sales by region as a bar chart\\"). Avg/min/max *in the legend* is still xy, not a combination chart.
      - heatmap: Colors a two-dimensional grid of x/y buckets by metric magnitude. Choose when both axes are buckets (categorical or time) and color should convey density or intensity (e.g. \\"errors by service and status code\\", \\"requests by hour of day and day of week\\").
      - tag_cloud: Displays terms sized by frequency or value. Choose only when the terms are short strings (tags, status codes, country codes, browsers). Do not use for long text such as URLs, browser agents, or log lines — use a table instead.
      - region_map: Choropleth map coloring geographic boundaries (country, state, county) by a metric. Choose when the data has region identifiers that join to map boundaries and a map view is expected (e.g. \\"revenue by state on a map\\").
      - data_table: Structured table with sortable columns. Choose when precise values, sortable columns, or multi-dimensional breakdowns matter more than visual patterns (e.g. \\"list top 20 hosts by CPU usage\\").
      - pie: Pie or donut showing part-to-whole proportions as slices. Choose for percentage breakdowns with a limited number of categories, ideally fewer than 7 (e.g. \\"traffic distribution by browser as a donut\\").
      - treemap: Nested rectangles where area encodes magnitude. Choose for size comparisons across many categories or hierarchical breakdowns (e.g. \\"disk usage by folder\\", \\"log volume by service and host\\").
      - waffle: Grid of small squares where the filled share encodes a proportion. Choose for intuitive single-percentage displays that read easier than pie charts (e.g. \\"percentage of requests that are errors\\").
      - mosaic: Tiled rectangles where area and position encode the joint distribution of two categorical dimensions. Choose for cross-tabulations (e.g. \\"request methods by status code\\", \\"error distribution across services and environments\\").",
      }
    `);
  });

  it('omits chart types that have no review content', () => {
    const review = getChartTypeReviewPromptContent();

    expect(review).not.toContain('### tag_cloud');
    expect(review).not.toContain('### region_map');
    expect(review).not.toContain('### waffle');
    expect(review).not.toContain('### mosaic');
    expect(review).not.toContain('### treemap');
    expect(review).toContain('### metric');
    expect(review).toContain('### data_table');
  });

  it('flags a duplicated title on a metric as critical', () => {
    expect(getChartTypeReviewPromptContent()).toContain(
      'A title on a metric is a critical issue — clear it.'
    );
  });

  it('puts shared palette bans under shared once', () => {
    const review = getChartTypeReviewPromptContent();
    expect(review.match(/COLOR PALETTE RULES:/g)).toHaveLength(1);
    expect(review.match(/Never introduce or switch to legacy palette IDs/g)).toHaveLength(1);
    expect(review.indexOf('### shared')).toBeLessThan(review.indexOf('### metric'));
  });

  it('does not restate the legacy palette ban on XY review', () => {
    const review = getChartTypeReviewPromptContent();
    const xySection = review.slice(review.indexOf('### xy'));

    expect(xySection).not.toContain('legacy palette IDs');
  });

  it('puts dynamic-step mechanics and one 5-stop palette list under shared once', () => {
    const review = getChartTypeReviewPromptContent();
    expect(review.match(/DYNAMIC STEPS/g)).toHaveLength(1);
    expect(review.match(/Available dynamic palettes/g)).toHaveLength(1);
    expect(review.indexOf('DYNAMIC STEPS')).toBeGreaterThan(review.indexOf('### shared'));
    expect(review.indexOf('DYNAMIC STEPS')).toBeLessThan(review.indexOf('### metric'));
    expect(review).toContain('canonical 5-stop');
    expect(review).toMatch(/metric:\s*3/);
    expect(review).toMatch(/gauge:\s*4/);
    expect(review).toContain('#61a2ff, #cfe1ff, #f6f9fc, #ffd4cf, #f6726a');
  });
});
