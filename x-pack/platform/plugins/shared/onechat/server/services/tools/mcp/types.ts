/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool as MCPTool, ToolProviderMetadata } from '@kbn/mcp-connector-common';
import type { ActionsClient, PluginStartContract } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';

export interface MCPConnector {
  id: string;
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  isPreconfigured: boolean;
  isSystemAction: boolean;
  isDeprecated: boolean;
}

export interface MCPToolWithMetadata extends MCPTool {
  provider: ToolProviderMetadata;
}

export interface CreateMcpProviderParams {
  actionsClient: ActionsClient;
  logger: Logger;
}

export interface CreateMcpProviderFnDeps {
  logger: Logger;
  actions: PluginStartContract;
}
