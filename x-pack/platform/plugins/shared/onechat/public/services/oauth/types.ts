/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-export common OAuth types for frontend use
 */
export type {
  OAuthTokenSet,
  OAuthServerMetadata,
  ProtectedResourceMetadata,
  McpOAuthConfig,
} from '@kbn/onechat-common';

/**
 * OAuth discovery configuration
 */
export interface OAuthDiscoveryConfig {
  /**
   * MCP server URL to discover OAuth endpoints for
   */
  mcpServerUrl: string;
  /**
   * Optional discovery URL from server config
   */
  discoveryUrl?: string;
}

/**
 * OAuth error types
 */
export enum OAuthErrorType {
  DISCOVERY_FAILED = 'discovery_failed',
  NO_AUTHORIZATION_SERVER = 'no_authorization_server',
  PKCE_NOT_SUPPORTED = 'pkce_not_supported',
  INVALID_METADATA = 'invalid_metadata',
  NETWORK_ERROR = 'network_error',
}

/**
 * OAuth error
 */
export class OAuthError extends Error {
  constructor(
    public type: OAuthErrorType,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

