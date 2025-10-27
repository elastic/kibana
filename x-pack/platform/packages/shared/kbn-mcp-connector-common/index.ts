/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ============================================================================
// CONNECTOR TYPES (Config & Secrets)
// ============================================================================

export type {
  MCPConnectorConfig,
  MCPConnectorHTTPServiceConfig,
  MCPConnectorAuthType,
  MCPConnectorSecrets,
  MCPConnectorSecretsNone,
  MCPConnectorSecretsBearer,
  MCPConnectorSecretsApiKey,
  MCPConnectorSecretsBasic,
  MCPConnectorSecretsCustomHeaders,
  MCPConnectorSubActionType,
  MCPCallToolParams,
  MCPListToolsParams,
  MCPExecutorParams,
} from './src/connector';

export {
  MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL,
  MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS,
} from './src/connector';

// ============================================================================
// MCP CLIENT TYPES
// ============================================================================

export type {
  CallToolRequest,
  CallToolResponse,
  Tool,
  ToolProviderMetadata,
  ListToolsResponse,
  ContentPart,
  TextPart,
} from './src/client';

// ============================================================================
// CONSTANTS
// ============================================================================

export { MCP_CONNECTOR_TYPE_ID, MCP_CONNECTOR_TITLE } from './src/constants';

// ============================================================================
// NAMESPACE UTILITIES
// ============================================================================

export {
  protectedNamespaces,
  MCP_NAMESPACE_PREFIX,
  isMcpToolId,
  createMcpToolId,
  parseMcpToolId,
  validateToolNamespace,
} from './src/namespaces';

// ============================================================================
// PROVIDER METADATA
// ============================================================================

export { createProviderMetadata } from './src/provider_metadata';

// ============================================================================
// SCHEMAS (Config & Secrets Validation)
// ============================================================================

export {
  MCPConnectorConfigSchema,
  MCPConnectorHTTPServiceConfigSchema,
  MCPConnectorSecretsSchema,
  MCPConnectorSecretsNoneSchema,
  MCPConnectorSecretsBearerSchema,
  MCPConnectorSecretsApiKeySchema,
  MCPConnectorSecretsBasicSchema,
  MCPConnectorSecretsCustomHeadersSchema,
  MCPExecutorParamsSchema,
} from './src/schema';
