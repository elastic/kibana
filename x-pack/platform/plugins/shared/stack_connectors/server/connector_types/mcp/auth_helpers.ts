/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorSecrets, MCPConnectorConfig } from '@kbn/connector-schemas/mcp';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import { getBasicAuthHeader } from '@kbn/actions-plugin/server';

/**
 * Builds HTTP headers from MCP connector config and secrets based on the authentication type.
 *
 * @param secrets - The MCP connector secrets (flat structure)
 * @param config - The MCP connector config (contains hasAuth, authType, and optional apiKeyHeaderName)
 * @returns Record of HTTP headers to use for authentication
 */
export function buildHeadersFromSecrets(
  secrets: MCPConnectorSecrets,
  config: MCPConnectorConfig
): Record<string, string> {
  const headers: Record<string, string> = {};

  // If no authentication is configured, return empty headers
  if (!config.hasAuth) {
    return headers;
  }

  const authType = config.authType;

  switch (authType) {
    case MCPAuthType.Bearer:
      if (secrets.token) {
        headers.Authorization = `Bearer ${secrets.token}`;
      }
      break;

    case MCPAuthType.ApiKey:
      if (secrets.apiKey) {
        const headerName = config.apiKeyHeaderName || 'X-API-Key';
        headers[headerName] = secrets.apiKey;
      }
      break;

    case MCPAuthType.Basic:
      if (secrets.user && secrets.password) {
        Object.assign(
          headers,
          getBasicAuthHeader({ username: secrets.user, password: secrets.password })
        );
      }
      break;

    default:
      // No specific auth type configured - this is valid when hasAuth is false
      break;
  }

  // Add any secret headers
  if (secrets.secretHeaders) {
    Object.assign(headers, secrets.secretHeaders);
  }

  return headers;
}
