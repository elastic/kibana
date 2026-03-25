/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const RESOURCE_URI = 'ui://chart-mcp-app/mcp-app.html';
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Reads the pre-built single-file HTML produced by vite + vite-plugin-singlefile.
 * Falls back to a minimal error page when the build artifact is missing.
 */
const loadBuiltHtml = (): string => {
  const htmlPath = path.resolve(__dirname, 'chart_mcp_app', 'dist', 'index.html');

  try {
    return fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Chart MCP App – Build Missing</title></head>
<body style="font-family:system-ui;padding:2rem;text-align:center">
  <h1>Chart MCP App</h1>
  <p>Build artifact not found. Run the vite build first:</p>
  <pre>cd server/routes/mcp_apps/chart_mcp_app &amp;&amp; npx vite build</pre>
</body>
</html>`;
  }
};

interface DateHistogramBucket {
  key: number;
  key_as_string: string;
  doc_count: number;
}

/**
 * Queries kibana_sample_data_logs for a date histogram aggregation
 * and returns the buckets as chart-ready data.
 */
const fetchDateHistogram = async (esClient: ElasticsearchClient) => {
  const response = await esClient.search({
    index: 'kibana_sample_data_logs',
    size: 0,
    body: {
      aggs: {
        logs_over_time: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: 'day',
          },
        },
      },
    },
  });

  const buckets = (
    (response.aggregations?.logs_over_time as { buckets?: DateHistogramBucket[] })?.buckets ?? []
  );

  return buckets.map((bucket) => ({
    timestamp: bucket.key,
    date: bucket.key_as_string,
    count: bucket.doc_count,
  }));
};

/**
 * Registers the "chart_mcp_app" MCP App tool and its associated HTML resource
 * on the given MCP server instance.
 *
 * The tool queries kibana_sample_data_logs for a date histogram and passes
 * the data to the iframe via structuredContent.
 */
export const registerChartMcpApp = (server: McpServer, esClient: ElasticsearchClient) => {
  const html = loadBuiltHtml();

  server.registerTool('chart_mcp_app', {
    title: 'Chart MCP App',
    description:
      'Displays a date histogram bar chart of kibana_sample_data_logs using Elastic Charts.',
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      'ui/resourceUri': RESOURCE_URI,
    },
  }, async () => {
    try {
      const chartData = await fetchDateHistogram(esClient);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Date histogram chart with ${chartData.length} data points from kibana_sample_data_logs.`,
          },
        ],
        structuredContent: { chartData },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to fetch chart data: ${message}. Make sure kibana_sample_data_logs is loaded.`,
          },
        ],
        isError: true,
      };
    }
  });

  server.registerResource(
    'Chart MCP App UI',
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      return {
        contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    }
  );
};
