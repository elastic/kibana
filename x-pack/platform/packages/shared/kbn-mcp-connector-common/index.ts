/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Client
export { McpClient } from './mcp/src/client';

// Types
export type {
  ClientDetails,
  CallToolParams,
  CallToolResponse,
  ContentPart,
  ListToolsResponse,
  Tool,
  ToolProviderMetadata,
} from './mcp/src/types';

// Schemas
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
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from './mcp/src/schema';

// Constants
export { MCP_CONNECTOR_TITLE, MCP_CONNECTOR_TYPE_ID } from './mcp/src/constants';
