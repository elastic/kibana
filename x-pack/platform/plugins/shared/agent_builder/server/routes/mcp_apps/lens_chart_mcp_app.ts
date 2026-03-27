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
 * Reuses the same build artifact as chart_mcp_app since it shares the same client bundle.
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
      description: `Renders a Lens visualization from a LensApiState spec with an ES|QL dataset.
Accepts a visualization spec (the API format used by Kibana Lens) and executes the embedded ES|QL query.
Supported chart types: xy (bar, line, area), metric, gauge, pie, donut, heatmap, tag_cloud, treemap, waffle, mosaic, data_table, legacy_metric, region_map.

Example: { "type": "xy", "layers": [{ "dataset": { "type": "esql", "query": "FROM kibana_sample_data_logs | EVAL t=DATE_TRUNC(1 day, @timestamp) | STATS count=COUNT(*) BY t" }, "type": "bar", "x": { "operation": "value", "column": "t" }, "y": [{ "operation": "value", "column": "count" }] }] }`,
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
