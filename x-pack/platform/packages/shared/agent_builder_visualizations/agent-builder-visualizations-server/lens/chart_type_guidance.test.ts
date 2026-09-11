/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getChartDesignPromptContent,
  getChartTypeConfigPromptContent,
  getChartTypeSelectionPromptContent,
} from './chart_type_guidance';
import { chartTypeRegistry } from './chart_type_registry';
import { colorDesignPromptContent } from './color_palettes';
import { generalChartGuidance } from './general_rules';

describe('chart type guidance', () => {
  it('includes only the requested chart defaults, once per chart type', () => {
    const design = getChartDesignPromptContent(['metric', 'metric', 'unknown']);

    expect(design.split('\n').filter((line) => line === 'metric:')).toHaveLength(1);
    expect(design).toContain('No panel title');
    expect(design).not.toContain('Gauge bounds and goals');
    expect(design).not.toContain('xy:');
    expect(design).not.toContain('unknown:');
    expect(design).toContain(colorDesignPromptContent);
  });

  it('does not include chart-specific defaults when no chart types are requested', () => {
    const design = getChartDesignPromptContent([]);

    for (const chartType of Object.values(SupportedChartType)) {
      expect(design.split('\n')).not.toContain(`${chartType}:`);
    }
  });

  it('keeps Lens JSON out of the shared design guidance', () => {
    const design = getChartDesignPromptContent(Object.values(SupportedChartType));

    expect(design).toContain('CHART DESIGN GUIDANCE');
    expect(design).toContain('COLOR GUIDANCE');
    expect(design).toContain('metric:');
    expect(design).not.toContain('apply_color_to');
    expect(design).not.toContain('styling.');
    expect(design).not.toContain('CONFIGURATION RULES');
  });

  it('gives the config author the design plus the configuration rules for one chart', () => {
    const metricConfig = getChartTypeConfigPromptContent(SupportedChartType.Metric);

    expect(metricConfig).toContain('DESIGN GUIDANCE');
    expect(metricConfig).toContain('No panel title');
    expect(metricConfig).toContain('CONFIGURATION RULES FOR METRIC');
    expect(metricConfig).toContain('styling.secondary.label.visible');
    expect(metricConfig).not.toContain('bar_horizontal');
  });

  it.each(Object.values(SupportedChartType))(
    'includes the shared and chart-specific rules in the %s config prompt',
    (chartType) => {
      const configPrompt = getChartTypeConfigPromptContent(chartType);
      const { design = [], config } = chartTypeRegistry[chartType].prompt;

      expect(configPrompt).toContain(`CONFIGURATION RULES FOR ${chartType.toUpperCase()}:`);
      expect(configPrompt).toContain(colorDesignPromptContent);
      for (const rule of [
        ...generalChartGuidance.design,
        ...generalChartGuidance.config,
        ...design,
        ...(config?.rules ?? []),
      ]) {
        expect(configPrompt.split('\n')).toContain(`- ${rule}`);
      }
    }
  );

  it('captures guidance wording without repeating shared rules for each chart', () => {
    expect({
      selection: getChartTypeSelectionPromptContent(),
      design: getChartDesignPromptContent(Object.values(SupportedChartType)),
      config: {
        general: generalChartGuidance.config,
        charts: Object.fromEntries(
          Object.values(SupportedChartType).map((chartType) => [
            chartType,
            chartTypeRegistry[chartType].prompt.config?.rules ?? [],
          ])
        ),
      },
    }).toMatchInlineSnapshot(`
      Object {
        "config": Object {
          "charts": Object {
            "data_table": Array [],
            "gauge": Array [
              "Omit \`min\`, \`max\`, and \`goal\` unless the user supplied them or the existing configuration already has them.",
            ],
            "heatmap": Array [],
            "metric": Array [
              "Trend backgrounds (\`background_chart: { type: \\"trend\\" }\`) and secondary metrics (a second \`metrics[]\` entry with \`type: \\"secondary\\"\`) must bind columns the same ES|QL query returns. Never invent another index or field.",
              "Progress bar: \`background_chart\` with \`type: \\"bar\\"\` and a \`max_value\` column, only for meaningful progress-to-max.",
              "For trend/delta secondary metrics, hide the label with \`styling.secondary.label.visible: false\` and omit \`label\`.",
            ],
            "mosaic": Array [],
            "pie": Array [],
            "region_map": Array [],
            "tag_cloud": Array [],
            "treemap": Array [],
            "waffle": Array [],
            "xy": Array [
              "For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.",
              "Hide axis titles with \`title: { visible: false }\` on both the x and y axes; do not set axis title text.",
              "Area series: \`styling.areas.fill: \\"gradient\\"\`.",
              "Legend: \`legend.position: \\"bottom\\"\` with the default outside placement; omit \`legend.layout.type\`. Leave \`legend.visibility\` unset (Lens auto-hides single-series legends) unless legend statistics are set — then set it to \\"visible\\".",
              "If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.",
            ],
          },
          "general": Array [
            "Titles: omit the \`title\` field when the design guidance calls for no panel title; every other chart needs a \`title\` string.",
            "Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.",
          ],
        },
        "design": "CHART DESIGN GUIDANCE:
      The Lens config author follows the same guidance; state the design choices you want and it expresses them in the chart settings.

      General:
      - Titles: omit the panel title when the chart already displays the information within itself (metric, gauge, tagcloud, and waffle charts show their value and label directly). When a title is needed, make it self-explanatory and exhaustive so axis titles become unnecessary. Never duplicate information across the title, axis titles, and metric labels.
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Explicit user choices and meaningful business thresholds or goals take precedence over defaults. An existing presentation setting alone is not evidence of user intent; during Prettify, apply the listed defaults unless an exception is supported.

      metric:
      - No panel title: the primary metric label already names the panel.
      - A single number is fine. When the query results support it and the value benefits from context, add a trend background or a secondary metric instead of leaving a lone number on white.
      - Show a progress bar only when the value has a meaningful maximum.
      - A secondary trend or delta needs no label; label a secondary metric only when it is a distinct named measure.
      - Color the value, not the background, and only when it carries meaning. Clearly bounded metrics (percent, ratio, CPU/memory/disk utilization, error rate, success rate, SLO compliance) benefit from status bands in the same scale as the value; for adverse metrics such as error rate, higher is worse. Unbounded values (raw counts, bytes, durations, throughput, rates with unknown scale) stay uncolored.

      gauge:
      - Gauge bounds and goals describe business targets. Never invent, infer, or backfill minimum, maximum, or goal values from the data or from units like bytes, requests, or rates; set them only when the user provides them, and keep existing ones on edits.
      - For new gauges, prefer four equal percentage color bands unless the user specifies different bands. When prettifying, request four equal percentage bands explicitly unless the existing bands reflect explicit user thresholds or meaningful business ranges. A focused color or palette edit keeps the existing band count, thresholds, and percentage or absolute scale.

      xy:
      - No axis titles: the panel title and column labels already convey meaning.
      - Area series use a gradient fill, never a solid fill.
      - Place the legend outside the plot, at the bottom. Hide it when it only repeats what is visible (a single series); show it when it carries legend statistics.
      - Let Lens assign series colors for every XY layer, including line, area, vertical bar, and horizontal bar series. During Prettify, remove existing static series colors and custom breakdown color overrides unless explicitly requested by the user or justified by clear semantic meaning. Return a concrete correction to reset those overrides to Lens defaults; do not preserve them just because they are already configured.

      heatmap:
      - Keep the default \\"Temperature\\" palette that Lens binds to the data; use a custom palette or thresholds only when the user asks.

      data_table:
      - Color table values as badges, and only where color adds meaning (status, severity, magnitude). Do not color cell backgrounds or text unless the user asks.

      pie:
      - Use the default palette; per-slice or custom colors only when the user asks.

      COLOR GUIDANCE:
      - Add color only when it adds meaning: status colors for meaningful thresholds, intensity colors for magnitude, and one consistent color for the same category wherever it appears across charts. Neutral data with no useful color meaning stays uncolored.
      - Choose palettes from the Kibana palette catalog, never invented colors or legacy palettes: \\"Status\\" for threshold bands, \\"Temperature\\" for intensity, \\"Complementary\\" for divergence, \\"Negative\\"/\\"Positive\\" for adverse/favorable values, \\"Cool\\"/\\"Warm\\"/\\"Gray\\" for neutral magnitude, and a categorical palette (e.g. \\"default\\", \\"severity\\") for distinct categories.
      - Thresholds are data values in the metric's own unit and scale. When only the colors change, keep the existing thresholds.
      - Preserve colors explicitly requested by the user or carrying clear semantic meaning, such as status/severity or the same named category across charts. A saved hex value or custom mapping alone does not establish intent. During Prettify, reset color overrides that do not meet these exceptions according to the chart-specific defaults; do not replace them with another arbitrary color.",
        "selection": "Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:
      - metric: Displays a single numeric value, KPI, or aggregate statistic (count, sum, average) with an optional trend line. Choose for single numbers without ranges or targets.
      - gauge: Displays a single metric within a range with optional min/max/goal bounds. Choose when showing progress toward a goal or performance against thresholds (e.g. \\"CPU usage as a gauge\\", \\"sales target progress\\").
      - xy: Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. \\"request count over time\\", \\"average CPU over time\\", \\"sales by region as a bar chart\\"). Avg/min/max *in the legend* is still xy, not a combination chart.
      - heatmap: Colors a two-dimensional grid of x/y buckets by metric magnitude. Choose when both axes are buckets (categorical or time) and color should convey density or intensity (e.g. \\"errors by service and status code\\", \\"requests by hour of day and day of week\\").
      - tag_cloud: Displays terms sized by frequency or value. Choose only when the terms are short strings (tags, status codes, country codes, browsers). Do not use for long text such as error messages, URLs, or log lines — use a table instead.
      - region_map: Choropleth map coloring geographic boundaries (country, state, county) by a metric. Choose when the data has region identifiers that join to map boundaries and a map view is expected (e.g. \\"revenue by state on a map\\").
      - data_table: Structured table with sortable columns. Choose when precise values, sortable columns, or multi-dimensional breakdowns matter more than visual patterns (e.g. \\"list top 20 hosts by CPU usage\\").
      - pie: Pie or donut showing part-to-whole proportions as slices. Choose for percentage breakdowns with a limited number of categories, ideally fewer than 7 (e.g. \\"traffic distribution by browser as a donut\\").
      - treemap: Nested rectangles where area encodes magnitude. Choose for size comparisons across many categories or hierarchical breakdowns (e.g. \\"disk usage by folder\\", \\"log volume by service and host\\").
      - waffle: Grid of small squares where the filled share encodes a proportion. Choose for intuitive single-percentage displays that read easier than pie charts (e.g. \\"percentage of requests that are errors\\").
      - mosaic: Tiled rectangles where area and position encode the joint distribution of two categorical dimensions. Choose for cross-tabulations (e.g. \\"request methods by status code\\", \\"error distribution across services and environments\\").",
      }
    `);
  });
});
