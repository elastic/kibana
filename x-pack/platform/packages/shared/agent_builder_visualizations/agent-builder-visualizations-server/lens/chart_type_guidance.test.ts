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
      - Do not set a chart title. The primary metric name is the painted title; a dashboard chrome title on a metric is redundant.
      - A single primary number is fine. Enrich it from the same ES|QL only when it adds meaning: a \`background_chart\` (\`type: \\"trend\\"\`) when the query can show change over time; a secondary metric with dynamic coloring when there is a status, threshold, or comparison (previous period, error rate next to request count, p95 next to avg); \`type: \\"bar\\"\` only when progress-to-max is meaningful. Do not invent a second index or a complementary field.
      - When a secondary metric is a trend (period-over-period change, compare-to-primary delta, or paired with a trend/sparkline background chart), hide its title: set \`styling.secondary.label.visible: false\` and omit \`label\` on the secondary metric. Keep the value and dynamic coloring. Show a secondary label only when the secondary is a different named measure (e.g. error rate next to request count).",
          "mosaic": "",
          "pie": "",
          "region_map": "",
          "tag_cloud": "",
          "treemap": "",
          "waffle": "",
          "xy": "CHART-SPECIFIC RULES FOR XY:
      - For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.
      - Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.
      - For area series, set \`styling.areas.fill: \\"gradient\\"\` rather than solid.
      - Default legend rules: Place outside at the bottom. Omit legend.layout.type. Set legend.visibility: \\"auto\\" unless legend statistics are set - then set it to \\"visible\\".
      - If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.",
        },
        "review": "CHART REVIEW RULES:
      ### metric
      - Do not set a chart title. The primary metric name is the painted title; a dashboard chrome title on a metric is redundant.
      - A single primary number is fine. Enrich it from the same ES|QL only when it adds meaning: a \`background_chart\` (\`type: \\"trend\\"\`) when the query can show change over time; a secondary metric with dynamic coloring when there is a status, threshold, or comparison (previous period, error rate next to request count, p95 next to avg); \`type: \\"bar\\"\` only when progress-to-max is meaningful. Do not invent a second index or a complementary field.
      - When a secondary metric is a trend (period-over-period change, compare-to-primary delta, or paired with a trend/sparkline background chart), hide its title: set \`styling.secondary.label.visible: false\` and omit \`label\` on the secondary metric. Keep the value and dynamic coloring. Show a secondary label only when the secondary is a different named measure (e.g. error rate next to request count).
      - A painted dashboard chrome title on a metric is a miss — the primary metric name is already the title.
      - Invented static colors or BACKGROUND fills on the primary metric are a miss.
      Considerations:
      - When a trend or status could be shown (time series available, or a clear threshold/comparison) and the panel is a lone number on white, consider adding a sparkline or secondary. A single number with nothing to compare or trend is fine.
      ### gauge
      - Always omit the optional 'min' and 'max' fields from the final configuration.
      - Do not infer, synthesize, or backfill gauge bounds from the ES|QL results or the user request.
      - Only include goal/target-related fields when the user explicitly asks for a goal or threshold.
      ### xy
      - For horizontal bars, use type: \\"bar_horizontal\\" with x = category field and y = metric field. Example: \\"top OS by count as horizontal bar\\" → type: \\"bar_horizontal\\", x: { column: \\"OS\\" }, y: [{ column: \\"Count\\" }]. Do NOT put the metric on x.
      - Do NOT set axis titles. Rely on the visualization title and column labels to convey meaning. Set axis title visibility to false (e.g. { visible: false }) for both X and Y axes.
      - For area series, set \`styling.areas.fill: \\"gradient\\"\` rather than solid.
      - Default legend rules: Place outside at the bottom. Omit legend.layout.type. Set legend.visibility: \\"auto\\" unless legend statistics are set - then set it to \\"visible\\".
      - If the request asks for series statistics *in the legend* (avg, min, max, median, last_value, last_non_null_value, first_value, count, total, standard_deviation, … — any legend.statistics option) without naming a field to aggregate, set legend.statistics to those options and legend.visibility: \\"visible\\". If the request is \\"average <field> over time\\", bind the AVG column from the query — do not treat that as legend statistics. Never invent statistic columns the query does not emit.
      - A solid area fill on the painted chart is a miss.
      - A visible legend on a one-series categorical chart is a miss.
      ### data_table
      - Invented custom cell or text colors are a miss.
      Considerations:
      - Consider setting width from the number of columns (\`w: 24\` or \`w: 48\`). More columns → closer to 48. Prefer not shrinking a table below 24.
      ### pie
      - Invented per-slice or custom colors are a miss.",
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
