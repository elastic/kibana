/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Client
export {
  McpClient,
  isStreamableHTTPError,
  isUnauthorizedError,
  isMcpError,
  MCP_ERROR_CODE_CONNECTION_CLOSED,
} from './mcp/src/client';
export { McpNotConnectedError } from './mcp/src/mcp_not_connected_error';

// Types
export type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export type {
  ClientDetails,
  CallToolParams,
  CallToolResponse,
  ContentPart,
  ResourceAnnotations,
  ResourceLinkPart,
  EmbeddedResourcePart,
  FetchLike,
  ListToolsResponse,
  Tool,
  ToolAnnotations,
  ToolProviderMetadata,
  TextPart,
  NonTextPart,
  McpClientOptions,
} from './mcp/src/types';
