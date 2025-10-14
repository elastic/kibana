/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * OAuth 2.1 token set returned from token endpoint
 */
export interface OAuthTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // Seconds until expiration
  expires_at?: number; // Unix timestamp (calculated from expires_in)
  token_type: 'Bearer';
  scope?: string;
}

/**
 * OAuth server metadata from discovery (RFC8414 / OpenID Connect Discovery)
 */
export interface OAuthServerMetadata {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
}

/**
 * Protected Resource Metadata (RFC9728)
 */
export interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported?: string[];
  bearer_methods_supported?: string[];
}

/**
 * MCP OAuth configuration (matches server config)
 */
export interface McpOAuthConfig {
  type: 'oauth';
  clientId: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  scopes?: string[];
  discoveryUrl?: string;
}

/**
 * MCP API Key configuration (matches server config)
 */
export interface McpApiKeyConfig {
  type: 'apiKey';
  headers: Record<string, string>;
}

/**
 * Union type for MCP auth configurations
 */
export type McpAuthConfig = McpApiKeyConfig | McpOAuthConfig;

