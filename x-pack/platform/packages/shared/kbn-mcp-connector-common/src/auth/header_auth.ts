/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MCPConnectorAuth, MCPConnectorAuthHeader } from './types';

/**
 * HTTP header structure.
 */
export interface Header {
  name: string;
  value: string;
}

/**
 * Create a Basic Authentication header.
 *
 * Encodes username and password in Base64 format according to RFC 7617.
 *
 * @param username - Username for basic auth
 * @param password - Password for basic auth
 * @returns Header object with 'Authorization' name and 'Basic <base64>' value
 *
 * @example
 * const header = createBasicAuthHeader('user', 'pass');
 * // Returns: { name: 'Authorization', value: 'Basic dXNlcjpwYXNz' }
 */
export function createBasicAuthHeader(username: string, password: string): Header {
  const credentials = `${username}:${password}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');

  return {
    name: 'Authorization',
    value: `Basic ${base64Credentials}`,
  };
}

/**
 * Create a Bearer token authentication header.
 *
 * Creates an 'Authorization' header with Bearer token scheme.
 *
 * @param token - Bearer token (API token, JWT, etc.)
 * @returns Header object with 'Authorization' name and 'Bearer <token>' value
 *
 * @example
 * const header = createBearerTokenHeader('abc123xyz');
 * // Returns: { name: 'Authorization', value: 'Bearer abc123xyz' }
 */
export function createBearerTokenHeader(token: string): Header {
  return {
    name: 'Authorization',
    value: `Bearer ${token}`,
  };
}

/**
 * Create an API key authentication header.
 *
 * Creates an API key header. By default, uses 'X-API-Key' header name,
 * but can be customized to use any header name.
 *
 * @param apiKey - API key value
 * @param headerName - Optional header name (defaults to 'X-API-Key')
 * @returns Header object with specified name and API key value
 *
 * @example
 * // Default X-API-Key header
 * const header = createApiKeyHeader('secret-key');
 * // Returns: { name: 'X-API-Key', value: 'secret-key' }
 *
 * @example
 * // Custom header name
 * const header = createApiKeyHeader('secret-key', 'Authorization');
 * // Returns: { name: 'Authorization', value: 'secret-key' }
 *
 * @example
 * // ApiKey scheme in Authorization header
 * const header = createApiKeyHeader('secret-key', 'Authorization');
 * header.value = `ApiKey ${header.value}`;
 * // Returns: { name: 'Authorization', value: 'ApiKey secret-key' }
 */
export function createApiKeyHeader(apiKey: string, headerName: string = 'X-API-Key'): Header {
  return {
    name: headerName,
    value: apiKey,
  };
}

/**
 * Build HTTP headers from authentication configuration.
 *
 * Converts MCPConnectorAuth configuration into a Record of header names to values
 * suitable for HTTP requests.
 *
 * @param auth - Authentication configuration
 * @returns Record of header names to values, empty object if no auth
 *
 * @example
 * // No auth
 * const headers = buildAuthHeaders({ type: 'none' });
 * // Returns: {}
 *
 * @example
 * // Bearer token
 * const headers = buildAuthHeaders({
 *   type: 'header',
 *   headers: [{ name: 'Authorization', value: 'Bearer abc123' }]
 * });
 * // Returns: { 'Authorization': 'Bearer abc123' }
 *
 * @example
 * // Multiple headers
 * const headers = buildAuthHeaders({
 *   type: 'header',
 *   headers: [
 *     { name: 'Authorization', value: 'Bearer abc123' },
 *     { name: 'X-Client-ID', value: 'my-client' }
 *   ]
 * });
 * // Returns: { 'Authorization': 'Bearer abc123', 'X-Client-ID': 'my-client' }
 *
 * @example
 * // OAuth (not yet implemented)
 * const headers = buildAuthHeaders({ type: 'oauth', oauthConfig: {...} });
 * // Throws: Error - OAuth not implemented
 */
export function buildAuthHeaders(auth: MCPConnectorAuth): Record<string, string> {
  if (auth.type === 'none') {
    return {};
  }

  if (auth.type === 'header') {
    const headerAuth = auth as MCPConnectorAuthHeader;
    const headers: Record<string, string> = {};

    for (const header of headerAuth.headers) {
      headers[header.name] = header.value;
    }

    return headers;
  }

  if (auth.type === 'oauth') {
    throw new Error(
      'OAuth authentication is not yet implemented. ' +
        'OAuth support will be added in a future release (Plan 003). ' +
        'Please use "header" authentication type with Bearer tokens for now.'
    );
  }

  // This should never happen due to TypeScript exhaustiveness checking,
  // but we handle it for runtime safety
  const _exhaustiveCheck: never = auth;
  throw new Error(`Unknown authentication type: ${JSON.stringify(_exhaustiveCheck)}`);
}
