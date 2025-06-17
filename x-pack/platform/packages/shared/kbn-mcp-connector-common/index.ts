/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  MCPConnectorConfig,
  MCPConnectorHTTPServiceConfig,
  MCPConnectorSecrets,
  MCPConnectorSecretsAPIKey,
  MCPConnectorSecretsBasicAuth,
  MCPConnectorSubActionType,
  MCPCallToolParams,
  MCPListToolsParams,
  MCPExecutorParams,
  MCPConnectorAuthType,
  MCPConnectorAuthTypeApiKey,
  MCPConnectorAuthTypeBasic,
  MCPConnectorSecretsNoAuth,
  MCPConnectorAuthTypeNone,
} from './src/connector';

export {
  MCP_CONNECTOR_AUTH_TYPE_API_KEY,
  MCP_CONNECTOR_AUTH_TYPE_BASIC,
  MCP_CONNECTOR_AUTH_TYPE_NONE,
  MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL,
  MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS,
} from './src/connector';

export type {
  CallToolRequest,
  CallToolResponse,
  Tool,
  ListToolsResponse,
  ContentPart,
  TextPart,
} from './src/client';

export { MCP_CONNECTOR_TYPE_ID, MCP_CONNECTOR_TITLE } from './src/constants';
