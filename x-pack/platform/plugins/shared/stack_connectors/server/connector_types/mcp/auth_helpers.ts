/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorSecrets, MCPConnectorConfig } from '@kbn/connector-schemas/mcp';

/**
 * Builds HTTP headers from MCP connector secrets based on the authentication type.
 *
 * @param secrets - The MCP connector secrets (discriminated union)
 * @param config - The MCP connector config (contains authType and optional apiKeyHeaderName)
 * @returns Record of HTTP headers to use for authentication
 */
export function buildHeadersFromSecrets(
  secrets: MCPConnectorSecrets,
  config: MCPConnectorConfig
): Record<string, string> {
  const headers: Record<string, string> = {};
  const authType = config.service.authType;

  switch (authType) {
    case 'none':
      // No authentication headers needed
      break;

    case 'bearer':
      if (secrets.authType === 'bearer' && secrets.token) {
        headers.Authorization = `Bearer ${secrets.token}`;
      }
      break;

    case 'apiKey':
      if (secrets.authType === 'apiKey' && secrets.apiKey) {
        const headerName = config.service.apiKeyHeaderName || 'X-API-Key';
        headers[headerName] = secrets.apiKey;
      }
      break;

    case 'basic':
      if (secrets.authType === 'basic' && secrets.username && secrets.password) {
        // Basic auth is handled by the MCP client transport, but we can set it here if needed
        // For now, we'll encode it as a header
        const credentials = Buffer.from(`${secrets.username}:${secrets.password}`).toString(
          'base64'
        );
        headers.Authorization = `Basic ${credentials}`;
      }
      break;

    case 'customHeaders':
      if (secrets.authType === 'customHeaders' && secrets.headers) {
        for (const header of secrets.headers) {
          headers[header.name] = header.value;
        }
      }
      break;

    default:
      // TypeScript should catch this, but adding for safety
      throw new Error(`Unsupported auth type: ${authType}`);
  }

  return headers;
}
