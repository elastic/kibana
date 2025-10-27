/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Authentication type selector.
 *
 * Determines which authentication method is used. The actual credentials
 * are stored in the secrets object (encrypted), while this type is stored
 * in config (not encrypted).
 */
export type MCPConnectorAuthType = 'none' | 'bearer' | 'apiKey' | 'basic' | 'customHeaders';

/**
 * MCP connector HTTP service configuration.
 *
 * Contains ONLY non-sensitive metadata (not encrypted).
 * Credentials are stored separately in MCPConnectorSecrets (encrypted).
 */
export interface MCPConnectorHTTPServiceConfig {
  /**
   * HTTP endpoint configuration.
   */
  http: {
    url: string;
  };
  /**
   * Authentication type selector.
   *
   * Required field that determines which authentication method to use.
   * The actual credentials are stored in the secrets object.
   */
  authType: MCPConnectorAuthType;
  /**
   * Optional custom header name for API key authentication.
   *
   * Only used when authType is 'apiKey'. Defaults to 'X-API-Key' if not specified.
   *
   * @example 'Authorization' - Use Authorization header with API key
   * @example 'X-Custom-Key' - Use custom header name
   */
  apiKeyHeaderName?: string;
}

/**
 * MCP connector configuration.
 *
 * Top-level configuration object for the connector. Contains only
 * non-sensitive metadata.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MCPConnectorConfig = {
  uniqueId?: string;
  description?: string;
  version?: string;
  service: MCPConnectorHTTPServiceConfig;
};

/**
 * No authentication secrets.
 *
 * Used when authType is 'none'.
 */
export interface MCPConnectorSecretsNone {
  authType: 'none';
}

/**
 * Bearer token authentication secrets.
 *
 * Used when authType is 'bearer'.
 */
export interface MCPConnectorSecretsBearer {
  authType: 'bearer';
  /**
   * Bearer token for authentication.
   *
   * Will be sent as: Authorization: Bearer <token>
   */
  token: string;
}

/**
 * API key authentication secrets.
 *
 * Used when authType is 'apiKey'.
 */
export interface MCPConnectorSecretsApiKey {
  authType: 'apiKey';
  /**
   * API key value.
   *
   * Header name is determined by config.service.apiKeyHeaderName (default: 'X-API-Key').
   */
  apiKey: string;
}

/**
 * Basic authentication secrets.
 *
 * Used when authType is 'basic'.
 */
export interface MCPConnectorSecretsBasic {
  authType: 'basic';
  /**
   * Username for basic authentication.
   */
  username: string;
  /**
   * Password for basic authentication.
   */
  password: string;
}

/**
 * Custom headers authentication secrets.
 *
 * Used when authType is 'customHeaders'.
 */
export interface MCPConnectorSecretsCustomHeaders {
  authType: 'customHeaders';
  /**
   * Array of custom headers to send with each request.
   *
   * Can include any headers needed for authentication.
   */
  headers: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * MCP connector secrets (credentials).
 *
 * Discriminated union type that contains actual credentials based on authType.
 * All secrets are encrypted by the encryptedSavedObjects service.
 *
 * The discriminator field (authType) must match the config.service.authType value.
 */
export type MCPConnectorSecrets =
  | MCPConnectorSecretsNone
  | MCPConnectorSecretsBearer
  | MCPConnectorSecretsApiKey
  | MCPConnectorSecretsBasic
  | MCPConnectorSecretsCustomHeaders;

export const MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS = 'listTools';
export const MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL = 'callTool';

export type MCPConnectorSubActionType =
  | typeof MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS
  | typeof MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL;

export interface MCPListToolsParams {
  subAction: typeof MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS;
  subActionParams: {};
}

export interface MCPCallToolParams {
  subAction: typeof MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL;
  subActionParams: {
    name: string;
    arguments?: Record<string, any>;
  };
}

export type MCPExecutorParams = MCPListToolsParams | MCPCallToolParams;
