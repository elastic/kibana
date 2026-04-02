/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';

import { z } from '@kbn/zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const RESOURCE_URI = 'ui://lens-chart-mcp-app/mcp-app.html';
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Reads the pre-built single-file HTML produced by vite + vite-plugin-singlefile.
 */
const loadBuiltHtml = (): string => {
  const htmlPath = path.resolve(__dirname, 'chart_mcp_app', 'dist', 'index.html');

  try {
    return fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Lens Chart MCP App – Build Missing</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center">
  <h1>Lens Chart MCP App</h1>
  <p>Build artifact not found. Run the vite build first:</p>
  <pre>cd server/routes/mcp_apps/chart_mcp_app &amp;&amp; npx vite build</pre>
</body>
</html>`;
  }
};

/**
 * Extracts the ES|QL query string from a LensApiState visualization spec.
 * Supports both top-level dataset and per-layer datasets (XY charts).
 */
const extractEsqlQuery = (visualization: Record<string, unknown>): string | null => {
  // Top-level dataset (metric, gauge, pie, heatmap, tagcloud, etc.)
  const dataset = visualization.dataset as Record<string, unknown> | undefined;
  if (dataset?.type === 'esql' && typeof dataset.query === 'string') {
    return dataset.query;
  }

  // XY chart: dataset lives on the first layer
  const layers = visualization.layers as Array<Record<string, unknown>> | undefined;
  if (layers && layers.length > 0) {
    const layerDataset = layers[0].dataset as Record<string, unknown> | undefined;
    if (layerDataset?.type === 'esql' && typeof layerDataset.query === 'string') {
      return layerDataset.query;
    }
  }

  return null;
};

/**
 * Executes an ES|QL query and returns the columnar result.
 */
const executeEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<{ columns: Array<{ name: string; type: string }>; values: unknown[][] }> => {
  const response = await esClient.esql.query({
    query,
    format: 'json',
  });

  const rawColumns = (response as any).columns ?? [];
  const columns: Array<{ name: string; type: string }> = rawColumns.map(
    (col: { name: string; type: string }) => ({
      name: col.name,
      type: col.type,
    })
  );

  const values: unknown[][] = (response as any).values ?? [];

  return { columns, values };
};

// ---------------------------------------------------------------------------
// Tool description — comprehensive guidance for LLMs on every chart type
// ---------------------------------------------------------------------------

const TOOL_DESCRIPTION = `Renders an interactive Lens visualization from a LensApiState spec with an ES|QL dataset.
The tool executes the embedded ES|QL query and renders the chart in the browser.

## Core Concepts

Every column reference uses this shape (called EsqlColumn):
  { "operation": "value", "column": "<column_name>", "label": "<optional display label>", "format": "<optional: percent|number|bytes>", "decimals": <optional number>, "compact": <optional boolean> }
The "column" must match a column name returned by the ES|QL query.

Every spec (except XY) has a top-level dataset:
  { "type": "esql", "query": "<ES|QL query string>" }

XY charts put the dataset on each layer instead of at the top level.

## Chart Types & Spec Structures

### 1. XY Charts (type: "xy") — Bar, Line, Area
Use for time series, comparisons, distributions, and trends.

Structure:
{
  "type": "xy",
  "title": "optional title",
  "layers": [{
    "dataset": { "type": "esql", "query": "..." },
    "type": "<series_type>",
    "x": <EsqlColumn>,          // x-axis (often a date or category)
    "y": [<EsqlColumn>, ...],   // one or more y-axis metrics
    "breakdown_by": <EsqlColumn> // optional: split into series by this column
  }],
  "legend": { "visibility": "auto|visible|hidden", "position": "top|bottom|left|right" },
  "axis": {
    "x":     { "title": { "value": "...", "visible": true } },
    "left":  { "title": { "value": "...", "visible": true } },
    "right": { "title": { "value": "...", "visible": true } }
  },
  "decorations": {
    "line_interpolation": "linear|smooth|stepped",
    "fill_opacity": 0.3,
    "point_visibility": "auto|always|never",
    "show_value_labels": false
  }
}

Series types for layers[].type:
  "bar"                        — vertical bar
  "bar_stacked"                — vertical stacked bar
  "bar_horizontal"             — horizontal bar
  "bar_horizontal_stacked"     — horizontal stacked bar
  "bar_percentage"             — vertical 100% stacked bar
  "bar_horizontal_percentage"  — horizontal 100% stacked bar
  "line"                       — line chart
  "area"                       — area chart
  "area_stacked"               — stacked area
  "area_percentage"            — 100% stacked area

Tips:
- The x-axis scale is auto-detected from the ES|QL column type: date columns become time axes, numeric become linear, otherwise ordinal.
- For time series, use DATE_TRUNC in ES|QL to bucket timestamps: EVAL t = DATE_TRUNC(1 day, @timestamp) | STATS count = COUNT(*) BY t
- Use breakdown_by to split series by a categorical column (e.g., response code, host name).
- Multiple y columns create multiple series on the same chart.
- For dual Y axes, add "axis": "right" to a y column.

Example — stacked bar over time with breakdown:
{
  "type": "xy",
  "title": "Requests by Response Code",
  "layers": [{
    "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | EVAL t = DATE_TRUNC(1 day, @timestamp) | STATS count = COUNT(*) BY t, response.keyword | LIMIT 200" },
    "type": "bar_stacked",
    "x": { "operation": "value", "column": "t" },
    "y": [{ "operation": "value", "column": "count", "label": "Requests" }],
    "breakdown_by": { "operation": "value", "column": "response.keyword" }
  }],
  "legend": { "visibility": "visible", "position": "right" }
}

Example — smooth line chart:
{
  "type": "xy",
  "title": "Bytes Over Time",
  "layers": [{
    "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | EVAL t = DATE_TRUNC(1 day, @timestamp) | STATS total_bytes = SUM(bytes) BY t" },
    "type": "line",
    "x": { "operation": "value", "column": "t" },
    "y": [{ "operation": "value", "column": "total_bytes", "label": "Total Bytes" }]
  }],
  "decorations": { "line_interpolation": "smooth" }
}

### 2. Metric (type: "metric")
Use for single KPI values, optionally with a secondary metric and/or breakdown tiles.

Structure:
{
  "type": "metric",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metrics": [
    { "type": "primary", "operation": "value", "column": "<col>", "label": "...", "format": "bytes|percent|number", "decimals": 2, "sub_label": "optional subtitle" },
    { "type": "secondary", "operation": "value", "column": "<col>", "label": "...", "prefix": "optional prefix" }
  ],
  "breakdown_by": { "operation": "value", "column": "<col>", "columns": 3 }
}

Tips:
- "metrics" must contain exactly one item with "type": "primary". An optional "type": "secondary" adds a secondary value.
- "format": "bytes" auto-formats as bytes, "percent" multiplies by 100 and appends %.
- Use breakdown_by to create one metric tile per unique group value (e.g., per host). "columns" controls the grid width (default 3).

Example — total bytes metric:
{
  "type": "metric",
  "title": "Total Bytes Transferred",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS total = SUM(bytes)" },
  "metrics": [{ "type": "primary", "operation": "value", "column": "total", "label": "Total Bytes", "format": "bytes" }]
}

Example — metric with breakdown:
{
  "type": "metric",
  "title": "Bytes by Machine OS",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS total = SUM(bytes) BY machine.os.keyword | LIMIT 6" },
  "metrics": [{ "type": "primary", "operation": "value", "column": "total", "label": "Bytes", "format": "bytes" }],
  "breakdown_by": { "operation": "value", "column": "machine.os.keyword", "columns": 3 }
}

### 3. Gauge (type: "gauge")
Use for showing a single value against a target/range.

Structure:
{
  "type": "gauge",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metric": {
    "operation": "value", "column": "<value_col>", "label": "...",
    "min": { "operation": "value", "column": "<min_col>" },
    "max": { "operation": "value", "column": "<max_col>" },
    "goal": { "operation": "value", "column": "<goal_col>" }
  },
  "shape": { "type": "arc|semi_circle|circle|bullet", "direction": "horizontal|vertical" }
}

Tips:
- min, max, goal are optional. Defaults: min=0, max=100.
- shape.type "arc", "semi_circle", "circle" render as a circular gauge; "bullet" renders as a horizontal bullet bar.
- min/max/goal can reference columns from the ES|QL query or be omitted for defaults.

Example — arc gauge:
{
  "type": "gauge",
  "title": "CPU Usage",
  "dataset": { "type": "esql", "query": "FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct)" },
  "metric": { "operation": "value", "column": "avg_cpu", "label": "Avg CPU" },
  "shape": { "type": "arc" }
}

### 4. Pie / Donut (type: "pie" or "donut")
Use for part-of-whole breakdowns.

Structure:
{
  "type": "pie",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metrics": [<EsqlColumn>],
  "group_by": [<EsqlColumn>, ...],
  "donut_hole": "none|small|medium|large",
  "legend": { "visible": true }
}

Tips:
- "metrics" contains a single EsqlColumn for the slice size value.
- "group_by" is an array of EsqlColumns — each creates a ring layer (outer → inner). Usually just one.
- Use type "donut" or set "donut_hole" to "small"|"medium"|"large" for a donut.
- The ES|QL query should GROUP BY the same column(s) as group_by and aggregate the metric.

Example — pie chart:
{
  "type": "pie",
  "title": "Traffic by Country",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY geo.dest | SORT bytes DESC | LIMIT 10" },
  "metrics": [{ "operation": "value", "column": "bytes" }],
  "group_by": [{ "operation": "value", "column": "geo.dest" }]
}

Example — donut chart:
{
  "type": "donut",
  "title": "Requests by OS",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS count = COUNT(*) BY machine.os.keyword | SORT count DESC | LIMIT 8" },
  "metrics": [{ "operation": "value", "column": "count" }],
  "group_by": [{ "operation": "value", "column": "machine.os.keyword" }],
  "donut_hole": "medium"
}

### 5. Heatmap (type: "heatmap")
Use for showing intensity across two categorical or temporal dimensions.

Structure:
{
  "type": "heatmap",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metric": <EsqlColumn>,
  "x": <EsqlColumn>,
  "y": <EsqlColumn>,
  "legend": { "visible": true }
}

Tips:
- "metric" is the cell value (color intensity).
- "x" is the horizontal axis, "y" is the vertical axis (optional — omit for a 1D heatmap).
- Colors are auto-generated as 4 bands from min to max of the metric values.
- The ES|QL query should GROUP BY the x and y columns and aggregate the metric.

Example:
{
  "type": "heatmap",
  "title": "Traffic: Source → Destination",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY geo.src, geo.dest | SORT bytes DESC | LIMIT 50" },
  "metric": { "operation": "value", "column": "bytes" },
  "x": { "operation": "value", "column": "geo.src" },
  "y": { "operation": "value", "column": "geo.dest" }
}

### 6. Tag Cloud (type: "tag_cloud")
Use for word/term frequency visualization.

Structure:
{
  "type": "tag_cloud",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metric": <EsqlColumn>,
  "tag_by": <EsqlColumn>,
  "orientation": "horizontal|vertical|angled",
  "font_size": { "min": 14, "max": 72 }
}

Tips:
- "metric" is the weight/size of each tag.
- "tag_by" is the column with tag labels/words.
- orientation: "horizontal" (all flat), "vertical" (all rotated 90°), "angled" (mixed angles).

Example:
{
  "type": "tag_cloud",
  "title": "Top URLs",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS count = COUNT(*) BY url.keyword | SORT count DESC | LIMIT 30" },
  "metric": { "operation": "value", "column": "count" },
  "tag_by": { "operation": "value", "column": "url.keyword" }
}

### 7. Treemap (type: "treemap")
Use for hierarchical part-of-whole visualizations with nested rectangles.

Structure:
{
  "type": "treemap",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metrics": [<EsqlColumn>],
  "group_by": [<EsqlColumn>, ...]
}

Tips:
- "metrics" contains a single EsqlColumn for the tile size value.
- "group_by" creates nested grouping levels (first = outer, second = inner).

Example:
{
  "type": "treemap",
  "title": "Bytes by OS and Browser",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY machine.os.keyword, agent.keyword | SORT bytes DESC | LIMIT 20" },
  "metrics": [{ "operation": "value", "column": "bytes" }],
  "group_by": [
    { "operation": "value", "column": "machine.os.keyword" },
    { "operation": "value", "column": "agent.keyword" }
  ]
}

### 8. Waffle (type: "waffle")
Use for part-of-whole visualization as a grid of small squares.

Structure:
{
  "type": "waffle",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metrics": [<EsqlColumn>],
  "group_by": [<EsqlColumn>, ...]
}

Tips:
- Same structure as treemap but renders as a waffle grid.

Example:
{
  "type": "waffle",
  "title": "Requests by Response Code",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS count = COUNT(*) BY response.keyword | SORT count DESC | LIMIT 10" },
  "metrics": [{ "operation": "value", "column": "count" }],
  "group_by": [{ "operation": "value", "column": "response.keyword" }]
}

### 9. Mosaic (type: "mosaic")
Use for two-dimensional categorical breakdown (like a stacked bar where both axes are categorical).

Structure:
{
  "type": "mosaic",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metric": <EsqlColumn>,
  "group_by": [<EsqlColumn>],
  "group_breakdown_by": [<EsqlColumn>]
}

Tips:
- "metric" (singular, not array) is the cell size value.
- "group_by" is the primary grouping (rows), "group_breakdown_by" is the secondary grouping (columns within rows).

Example:
{
  "type": "mosaic",
  "title": "Bytes: OS × Response",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS bytes = SUM(bytes) BY machine.os.keyword, response.keyword | LIMIT 20" },
  "metric": { "operation": "value", "column": "bytes" },
  "group_by": [{ "operation": "value", "column": "machine.os.keyword" }],
  "group_breakdown_by": [{ "operation": "value", "column": "response.keyword" }]
}

### 10. Data Table (type: "data_table")
Use for displaying raw tabular data from an ES|QL query.

Structure:
{
  "type": "data_table",
  "title": "optional title",
  "dataset": { "type": "esql", "query": "..." },
  "metrics": [<EsqlColumn>, ...],
  "rows": [<EsqlColumn>, ...]
}

Tips:
- "rows" columns appear first (left side), "metrics" columns appear after.
- If both rows and metrics are omitted, all columns from the ES|QL result are displayed.
- Use this when the user wants to see raw data or when no chart type fits.

Example:
{
  "type": "data_table",
  "title": "Top Hosts",
  "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | STATS count = COUNT(*), bytes = SUM(bytes) BY host.keyword | SORT count DESC | LIMIT 20" },
  "rows": [{ "operation": "value", "column": "host.keyword", "label": "Host" }],
  "metrics": [
    { "operation": "value", "column": "count", "label": "Requests" },
    { "operation": "value", "column": "bytes", "label": "Total Bytes" }
  ]
}

## ES|QL Query Guidelines

- Column names in the spec MUST match column names returned by the ES|QL query exactly.
- Use EVAL to create computed/renamed columns: EVAL t = DATE_TRUNC(1 day, @timestamp)
- Use STATS ... BY ... for aggregations and groupings.
- Use SORT and LIMIT to control data volume — keep result sets reasonable (LIMIT 10-200 depending on chart type).
- For time series (XY), always bucket with DATE_TRUNC and include SORT on the time column.
- For top-N charts (pie, treemap, tag cloud, bar), SORT DESC on the metric and LIMIT.
- Avoid SELECT * patterns; always aggregate or filter to keep data focused.

## Common Patterns

- Time series: XY chart with DATE_TRUNC bucketing on x-axis.
- Top-N ranking: Bar chart (horizontal) or pie/donut with SORT DESC | LIMIT N.
- KPI dashboard tile: Metric chart with a single STATS aggregation.
- Comparison across categories: Bar chart with breakdown_by or stacked bars.
- Distribution/density: Heatmap with two GROUP BY dimensions.
- Hierarchical breakdown: Treemap with multiple group_by levels.
- Proportional comparison: Waffle or pie/donut.`;

/**
 * Registers the "lens_chart_mcp_app" MCP tool and its associated HTML resource
 * on the given MCP server instance.
 *
 * This tool accepts a LensApiState visualization spec (ES|QL dataset),
 * executes the query, and returns structured content for rendering.
 */
export const registerLensChartMcpApp = (server: McpServer, esClient: ElasticsearchClient) => {
  const html = loadBuiltHtml();

  server.registerTool(
    'lens_chart_mcp_app',
    {
      title: 'Lens Chart MCP App',
      description: TOOL_DESCRIPTION,
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        'ui/resourceUri': RESOURCE_URI,
      },
      inputSchema: {
        visualization: z
          .object({})
          .passthrough()
          .describe(
            'The LensApiState visualization spec. Must include a dataset with type "esql" and a query string.'
          ),
      },
    },
    async ({ visualization }: { visualization: Record<string, unknown> }) => {
      try {
        const query = extractEsqlQuery(visualization);
        if (!query) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No ES|QL query found in the visualization spec. Ensure the dataset has type "esql" with a "query" property.',
              },
            ],
            isError: true,
          };
        }

        const data = await executeEsqlQuery(esClient, query);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Chart rendered: ${visualization.type ?? 'unknown'} with ${
                data.values.length
              } data points and ${data.columns.length} columns.`,
            },
          ],
          structuredContent: {
            visualization,
            data,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to execute ES|QL query: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerResource(
    'Lens Chart MCP App UI',
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      return {
        contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    }
  );
};
