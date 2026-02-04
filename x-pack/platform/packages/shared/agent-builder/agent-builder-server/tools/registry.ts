/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/agent-builder-common';
import type { ScopedRunnerRunToolsParams, RunToolReturn } from '../runner';
import type { InternalToolDefinition } from './internal';

/**
 * Parameters for listing tools.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ToolListParams {
  // blank for now
  // type?: ToolType[];
  // tags?: string[];
}

/**
 * Parameters for creating a tool.
 */
export interface ToolCreateParams<TConfig extends object = {}> {
  id: string;
  type: ToolType;
  description?: string;
  tags?: string[];
  configuration: TConfig;
}

/**
 * Parameters for updating a tool.
 */
export interface ToolUpdateParams<TConfig extends object = {}> {
  description?: string;
  tags?: string[];
  configuration?: Partial<TConfig>;
}

/**
 * Registry for managing tools within an agent execution context.
 *
 * Provides methods for CRUD operations on tools and tool execution.
 */
export interface ToolRegistry {
  /**
   * Check if a tool exists in the registry.
   */
  has(toolId: string): Promise<boolean>;
  /**
   * Get a tool by its ID.
   * Throws if the tool is not found.
   */
  get(toolId: string): Promise<InternalToolDefinition>;
  /**
   * List all available tools.
   */
  list(opts?: ToolListParams): Promise<InternalToolDefinition[]>;
  /**
   * Create a new tool.
   */
  create(tool: ToolCreateParams): Promise<InternalToolDefinition>;
  /**
   * Update an existing tool.
   */
  update(toolId: string, update: ToolUpdateParams): Promise<InternalToolDefinition>;
  /**
   * Delete a tool.
   */
  delete(toolId: string): Promise<boolean>;
  /**
   * Execute a tool.
   */
  execute<TParams extends object = Record<string, unknown>>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn>;
}
