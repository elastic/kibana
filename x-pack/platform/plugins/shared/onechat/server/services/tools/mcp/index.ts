/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createMcpProviderFn, createMcpToolProvider } from './mcp_provider';
export type {
  CreateMcpProviderParams,
  CreateMcpProviderFnDeps,
  MCPConnector,
  MCPToolWithMetadata,
} from './types';
export { convertMcpToolToAgentBuilderTool } from './converter';
