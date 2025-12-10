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
  TextPart,
  NonTextPart,
  McpClientOptions,
} from './mcp/src/types';
