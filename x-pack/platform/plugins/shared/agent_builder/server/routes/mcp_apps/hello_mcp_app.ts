/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const RESOURCE_URI = 'ui://hello-mcp-app/mcp-app.html';
const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

const HELLO_MCP_APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Hello MCP App</title>
  <style>
    :root {
      color-scheme: light dark;
      --color-text-primary: light-dark(#1f2937, #f3f4f6);
      --color-background-primary: light-dark(#ffffff, #1a1a1a);
      --font-sans: ui-sans-serif, system-ui, sans-serif;
      --font-weight-bold: 700;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: var(--font-sans);
      color: var(--color-text-primary);
      background: var(--color-background-primary);
    }
    .main {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: var(--font-weight-bold);
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="main">
    <h1>CAN HAZ MCP APP</h1>
  </main>
</body>
</html>`;

/**
 * Registers the "hello_mcp_app" MCP App tool and its associated HTML resource
 * on the given MCP server instance.
 */
export const registerHelloMcpApp = (server: McpServer) => {
  // Register the tool with UI metadata linking it to the HTML resource
  server.registerTool('hello_mcp_app', {
    title: 'Hello MCP App',
    description: 'Displays a simple MCP App UI greeting.',
    _meta: {
      ui: { resourceUri: RESOURCE_URI },
      'ui/resourceUri': RESOURCE_URI,
    },
  }, async () => {
    return {
      content: [{ type: 'text' as const, text: 'CAN HAZ MCP APP' }],
    };
  });

  // Register the HTML resource that MCP App-capable hosts will fetch and render
  server.registerResource(
    'Hello MCP App UI',
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      return {
        contents: [{ uri: RESOURCE_URI, mimeType: RESOURCE_MIME_TYPE, text: HELLO_MCP_APP_HTML }],
      };
    }
  );
};
