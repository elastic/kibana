/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type {
  MCPConnectorHTTPServiceConfigSchema,
  MCPConnectorConfigSchema,
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
  MCPConnectorSecretsSchema,
} from './schema';

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
 * Derived from schema.
 */
export type MCPConnectorHTTPServiceConfig = TypeOf<typeof MCPConnectorHTTPServiceConfigSchema>;

/**
 * MCP connector configuration.
 * Derived from schema.
 */
export type MCPConnectorConfig = TypeOf<typeof MCPConnectorConfigSchema>;

/**
 * No authentication secrets.
 * Derived from schema.
 */
export type MCPConnectorSecretsNone = TypeOf<typeof MCPConnectorSecretsNoneSchema>;

/**
 * Bearer token authentication secrets.
 * Derived from schema.
 */
export type MCPConnectorSecretsBearer = TypeOf<typeof MCPConnectorSecretsBearerSchema>;

/**
 * API key authentication secrets.
 * Derived from schema.
 */
export type MCPConnectorSecretsApiKey = TypeOf<typeof MCPConnectorSecretsApiKeySchema>;

/**
 * Basic authentication secrets.
 * Derived from schema.
 */
export type MCPConnectorSecretsBasic = TypeOf<typeof MCPConnectorSecretsBasicSchema>;

/**
 * Custom headers authentication secrets.
 * Derived from schema.
 */
export type MCPConnectorSecretsCustomHeaders = TypeOf<
  typeof MCPConnectorSecretsCustomHeadersSchema
>;

/**
 * MCP connector secrets (discriminated union).
 * Derived from schema.
 */
export type MCPConnectorSecrets = TypeOf<typeof MCPConnectorSecretsSchema>;

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
