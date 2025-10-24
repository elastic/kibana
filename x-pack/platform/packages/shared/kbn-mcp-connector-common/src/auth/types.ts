/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Authentication types supported by MCP connectors.
 *
 * - 'none': No authentication required
 * - 'header': Header-based authentication (Bearer, Basic, API-Key, custom)
 * - 'oauth': OAuth 2.0 with PKCE (placeholder for future implementation)
 */
export type MCPConnectorAuthType = 'none' | 'header' | 'oauth';

/**
 * No authentication configuration.
 *
 * Use when the MCP server doesn't require authentication.
 */
export interface MCPConnectorAuthNone {
  type: 'none';
}

/**
 * Header-based authentication configuration.
 *
 * Supports multiple authentication schemes:
 * - Bearer tokens: `Authorization: Bearer <token>`
 * - Basic auth: `Authorization: Basic <base64>`
 * - API keys: `X-API-Key: <key>` or custom header name
 * - Custom headers: Any header name/value pairs
 *
 * @example
 * // Bearer token
 * {
 *   type: 'header',
 *   headers: [{ name: 'Authorization', value: 'Bearer abc123' }]
 * }
 *
 * @example
 * // Basic auth
 * {
 *   type: 'header',
 *   headers: [{ name: 'Authorization', value: 'Basic dXNlcjpwYXNz' }]
 * }
 *
 * @example
 * // API key with custom header
 * {
 *   type: 'header',
 *   headers: [{ name: 'X-API-Key', value: 'secret-key' }]
 * }
 *
 * @example
 * // Multiple headers
 * {
 *   type: 'header',
 *   headers: [
 *     { name: 'Authorization', value: 'Bearer abc123' },
 *     { name: 'X-Client-ID', value: 'my-client' }
 *   ]
 * }
 */
export interface MCPConnectorAuthHeader {
  type: 'header';
  headers: Array<{ name: string; value: string }>;
}

/**
 * OAuth 2.0 authentication configuration.
 *
 * **Placeholder for future implementation (Plan 003).**
 *
 * Will support:
 * - OAuth 2.0 authorization code flow with PKCE
 * - Per-user authentication (user-scoped OAuth tokens)
 * - Automatic token refresh
 * - OpenID Connect discovery
 *
 * Currently, attempting to use OAuth auth will result in an error.
 *
 * @example
 * // Future implementation
 * {
 *   type: 'oauth',
 *   oauthConfig: {
 *     discoveryUrl: 'https://auth.example.com/.well-known/openid-configuration',
 *     clientId: 'my-client-id',
 *     scopes: ['read', 'write']
 *   }
 * }
 */
export interface MCPConnectorAuthOAuth {
  type: 'oauth';
  /**
   * OAuth configuration (placeholder).
   *
   * Will be fully defined in Plan 003.
   */
  oauthConfig?: {
    discoveryUrl?: string;
    clientId?: string;
    scopes?: string[];
  };
}

/**
 * Union type of all authentication configurations.
 *
 * Use this type for auth configuration fields.
 */
export type MCPConnectorAuth =
  | MCPConnectorAuthNone
  | MCPConnectorAuthHeader
  | MCPConnectorAuthOAuth;
