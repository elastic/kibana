/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServerConfig } from './config';

/**
 * Validates MCP server configurations for common issues
 * @param servers Array of MCP server configurations
 * @returns Array of validation error messages (empty if valid)
 */
export function validateMcpServerConfigs(servers: McpServerConfig[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  servers.forEach((server, index) => {
    // Validate unique IDs
    if (ids.has(server.id)) {
      errors.push(`Duplicate MCP server ID: "${server.id}" at index ${index}`);
    }
    ids.add(server.id);

    // Validate ID format (lowercase alphanumeric with hyphens/underscores)
    if (!/^[a-z0-9][a-z0-9-_]*$/.test(server.id)) {
      errors.push(
        `Invalid MCP server ID: "${server.id}" at index ${index}. Must be lowercase alphanumeric with hyphens/underscores, starting with alphanumeric character.`
      );
    }

    // Validate URL format
    try {
      new URL(server.url);
    } catch {
      errors.push(`Invalid URL for MCP server "${server.id}" at index ${index}: ${server.url}`);
    }

    // Validate OAuth configuration
    if (server.auth?.type === 'oauth') {
      // Check if clientId is provided
      if (!server.auth.clientId) {
        errors.push(
          `OAuth configuration for MCP server "${server.id}" at index ${index} must provide a clientId.`
        );
      }

      // Distinguish between OAuth flows based on presence of clientSecret
      const isClientCredentialsFlow = Boolean(server.auth.clientSecret);

      if (isClientCredentialsFlow) {
        // Client Credentials flow (machine-to-machine)
        // tokenEndpoint is OPTIONAL:
        //   - If provided (or auto-detected for PayPal): performs OAuth token exchange
        //   - If NOT provided: uses clientId/clientSecret as HTTP Basic Auth directly
        // No validation error if tokenEndpoint is missing
      } else {
        // Authorization Code flow (user authentication)
        // Requires either explicit endpoints OR discoveryUrl
        const hasExplicitEndpoints = Boolean(
          server.auth.authorizationEndpoint && server.auth.tokenEndpoint
        );
        const hasDiscoveryUrl = Boolean(server.auth.discoveryUrl);

        if (!hasExplicitEndpoints && !hasDiscoveryUrl) {
          errors.push(
            `OAuth Authorization Code flow for MCP server "${server.id}" at index ${index} must provide either both authorizationEndpoint and tokenEndpoint, OR a discoveryUrl for automatic discovery.`
          );
        }
      }
    }

    // Warn if server is enabled but has no auth (optional, not an error)
    if (server.enabled && !server.auth) {
      // This is just a warning - some MCP servers may not require auth
      // We'll log this in the connection manager instead
    }
  });

  return errors;
}
