/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';

export interface ExecuteToolParams {
  toolId: string;
  toolParams: Record<string, unknown>;
  connectorId?: string;
}

export interface ExecuteToolReturn {
  results: ToolResult[];
}

/**
 * Public-facing contract for AgentBuilder's tool service.
 */
export interface ToolServiceStartContract {
  /**
   * Retrieve a tool based on its ID.
   */
  get(toolId: string): Promise<ToolDefinitionWithSchema>;
  /**
   * List all tools available in the current context.
   */
  list(): Promise<ToolDefinitionWithSchema[]>;
  /**
   * Execute a tool and returns the results.
   */
  execute(params: ExecuteToolParams): Promise<ExecuteToolReturn>;
}
