/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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

/**
 * Registers the "chart_mcp_app" MCP App tool and its associated HTML resource
 * on the given MCP server instance.
 *
 * The tool renders a bar chart using Elastic Charts with mock data.
 */
export const registerChartMcpApp = (server: McpServer) => {
  const html = loadBuiltHtml();

  server.registerTool('chart_mcp_app', {
    title: 'Chart MCP App',
    description: 'Displays a bar chart built with Elastic Charts and mock data.',
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      'ui/resourceUri': RESOURCE_URI,
    },
  }, async () => {
    return {
      content: [{ type: 'text' as const, text: 'Bar chart rendered with Elastic Charts (mock data).' }],
    };
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
