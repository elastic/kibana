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

describe('chart type guidance', () => {
  it('keeps Lens JSON out of the shared design guidance', () => {
    const design = getChartDesignPromptContent();

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

  it('compiles selection, design, and config prompt content', () => {
    expect({
      selection: getChartTypeSelectionPromptContent(),
      design: getChartDesignPromptContent(),
      config: Object.fromEntries(
        Object.values(SupportedChartType).map((chartType) => [
          chartType,
          getChartTypeConfigPromptContent(chartType),
        ])
      ),
    }).toMatchInlineSnapshot(`
      Object {
        "config": Object {
          "data_table": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Color table values as badges, and only where color adds meaning (status, severity, magnitude). Do not color cell backgrounds or text unless the user asks.

      CONFIGURATION RULES FOR DATA_TABLE:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "gauge": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - No panel title: the gauge label names the measure.
      - Gauge bounds and goals describe business targets. Use supplied or meaningful existing bounds and goals; never invent business targets from the data or units.
      - Default to four equal percentage color bands. During enhancement, evaluate existing thresholds: retain meaningful boundaries, otherwise restore the default bands. A focused palette edit preserves boundaries and scale.

      CONFIGURATION RULES FOR GAUGE:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Omit the top-level \`title\` field. Name the measure using the chart's internal labels.
      - Omit \`min\`, \`max\`, and \`goal\` unless supplied or meaningful in the existing configuration.",
          "heatmap": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Keep the default \\"Temperature\\" palette that Lens binds to the data; use a custom palette or thresholds only when the user asks.

      CONFIGURATION RULES FOR HEATMAP:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "metric": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - No panel title: the primary metric label already names the panel.
      - A single number is fine. When the query results support it and the value benefits from context, add a trend background or a secondary metric instead of leaving a lone number on white.
      - Show a progress bar only when the value has a meaningful maximum.
      - A secondary trend or delta needs no label; label a secondary metric only when it is a distinct named measure.
      - Color the value, not the background, and only when it carries meaning. Bounded metrics (percent, ratio, CPU/memory/disk utilization, error rate, success rate, SLO compliance) can use status bands when meaningful thresholds are supported by the query or context; for adverse metrics such as error rate, higher is worse. Unbounded values and metrics without defensible thresholds stay uncolored.

      CONFIGURATION RULES FOR METRIC:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Omit the top-level \`title\` field. Name the measure using the chart's internal labels.
      - Trend backgrounds (\`background_chart: { type: \\"trend\\" }\`) and secondary metrics (a second \`metrics[]\` entry with \`type: \\"secondary\\"\`) must bind columns the same ES|QL query returns. Never invent another index or field.
      - Progress bar: \`background_chart\` with \`type: \\"bar\\"\` and a \`max_value\` column, only for meaningful progress-to-max.
      - For trend/delta secondary metrics, hide the label with \`styling.secondary.label.visible: false\` and omit \`label\`.",
          "mosaic": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      CONFIGURATION RULES FOR MOSAIC:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "pie": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Use the default palette; per-slice or custom colors only when the user asks.

      CONFIGURATION RULES FOR PIE:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "region_map": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      CONFIGURATION RULES FOR REGION_MAP:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "tag_cloud": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - No panel title: use the labels within the tag cloud.

      CONFIGURATION RULES FOR TAG_CLOUD:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Omit the top-level \`title\` field. Name the measure using the chart's internal labels.",
          "treemap": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      CONFIGURATION RULES FOR TREEMAP:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.",
          "waffle": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - No panel title: use the labels within the waffle chart.

      CONFIGURATION RULES FOR WAFFLE:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Omit the top-level \`title\` field. Name the measure using the chart's internal labels.",
          "xy": "DESIGN GUIDANCE:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - No axis titles: the panel title and column labels already convey meaning.
      - Area series use a gradient fill, never a solid fill.
      - Place the legend outside the plot, at the bottom. Hide it when it only repeats what is visible (a single series); show it when it carries legend statistics.
      - Use the default Lens palette. During enhancement, remove all custom palettes and series color overrides. Outside enhancement, explicit color requests may override the default.

      CONFIGURATION RULES FOR XY:
      - Number formats — set \`format\` on the bound column: CPU / utilization percentages → { type: \\"percent\\", decimals: 1, compact: true }; bytes → { type: \\"bytes\\", decimals: 1 }; bits → { type: \\"bits\\", decimals: 1 }; durations → { type: \\"duration\\", from: \\"<source unit>\\", to: \\"\\" } where <source unit> matches the ES field unit (e.g. \\"ms\\", \\"s\\", \\"micros\\"). Do NOT apply a format to plain counts or ambiguous units.
      - Set the top-level \`title\` field to the panel title.
      - For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.
      - Hide axis titles with \`title: { visible: false }\` on both the x and y axes; do not set axis title text.
      - Area series: \`styling.areas.fill: \\"gradient\\"\`.
      - Legend: \`legend.position: \\"bottom\\"\` with the default outside placement; omit \`legend.layout.type\`. Leave \`legend.visibility\` unset (Lens auto-hides single-series legends) unless legend statistics are set — then set it to \\"visible\\".
      - If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.",
        },
        "design": "CHART DESIGN GUIDANCE:
      The Lens config author follows the same guidance; state the design choices you want and it expresses them in the chart settings.

      General:
      - Units: show values in their natural unit whenever the data has a well-known one — percentages for utilization and rates, bytes for storage, memory, and network volume, bits for network throughput, human-readable durations for latency and response times. Column names and the request often reveal the unit (e.g. \\"cpu\\", \\"percent\\", \\"bytes_in\\", \\"disk_used\\", \\"latency_ms\\"); apply it even when nobody asked. Plain counts, rates without a known scale, and ambiguous units stay unformatted.

      metric:
      - No panel title: the primary metric label already names the panel.
      - A single number is fine. When the query results support it and the value benefits from context, add a trend background or a secondary metric instead of leaving a lone number on white.
      - Show a progress bar only when the value has a meaningful maximum.
      - A secondary trend or delta needs no label; label a secondary metric only when it is a distinct named measure.
      - Color the value, not the background, and only when it carries meaning. Bounded metrics (percent, ratio, CPU/memory/disk utilization, error rate, success rate, SLO compliance) can use status bands when meaningful thresholds are supported by the query or context; for adverse metrics such as error rate, higher is worse. Unbounded values and metrics without defensible thresholds stay uncolored.

      gauge:
      - No panel title: the gauge label names the measure.
      - Gauge bounds and goals describe business targets. Use supplied or meaningful existing bounds and goals; never invent business targets from the data or units.
      - Default to four equal percentage color bands. During enhancement, evaluate existing thresholds: retain meaningful boundaries, otherwise restore the default bands. A focused palette edit preserves boundaries and scale.

      xy:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - No axis titles: the panel title and column labels already convey meaning.
      - Area series use a gradient fill, never a solid fill.
      - Place the legend outside the plot, at the bottom. Hide it when it only repeats what is visible (a single series); show it when it carries legend statistics.
      - Use the default Lens palette. During enhancement, remove all custom palettes and series color overrides. Outside enhancement, explicit color requests may override the default.

      heatmap:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Keep the default \\"Temperature\\" palette that Lens binds to the data; use a custom palette or thresholds only when the user asks.

      tag_cloud:
      - No panel title: use the labels within the tag cloud.

      region_map:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      data_table:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Color table values as badges, and only where color adds meaning (status, severity, magnitude). Do not color cell backgrounds or text unless the user asks.

      pie:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.
      - Use the default palette; per-slice or custom colors only when the user asks.

      treemap:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      waffle:
      - No panel title: use the labels within the waffle chart.

      mosaic:
      - Include a concise panel title naming the measure and breakdown; category labels do not replace it.

      COLOR GUIDANCE:
      - Add color only when it adds meaning: status colors for meaningful thresholds, intensity colors for magnitude, and categorical palettes for distinct categories. Neutral data with no useful color meaning stays uncolored.
      - Choose palettes from the Kibana palette catalog, never invented colors or legacy palettes: \\"Status\\" for threshold bands, \\"Temperature\\" for intensity, \\"Complementary\\" for divergence, \\"Negative\\"/\\"Positive\\" for adverse/favorable values, \\"Cool\\"/\\"Warm\\"/\\"Gray\\" for neutral magnitude, and a categorical palette (e.g. \\"default\\", \\"severity\\") for distinct categories.
      - Thresholds are data values in the metric's own unit and scale. A bounded value alone does not establish meaningful status thresholds.",
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
