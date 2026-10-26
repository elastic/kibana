/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Client
export { McpClient } from './mcp/src/client';
export { McpNotConnectedError } from './mcp/src/mcp_not_connected_error';

// Errors - re-exported from SDK for use by consumers
export { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
export { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
export { McpError, ErrorCode as McpErrorCode } from '@modelcontextprotocol/sdk/types.js';

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
