/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IndexSearchToolConfig = {
  pattern: string;
  row_limit?: number;
  custom_instructions?: string;
};

export type IndexSearchToolDefinition = ToolDefinition<
  ToolType.index_search,
  IndexSearchToolConfig
>;
export type IndexSearchToolDefinitionWithSchema = ToolDefinitionWithSchema<
  ToolType.index_search,
  IndexSearchToolConfig
>;

export function isIndexSearchTool(
  tool: ToolDefinitionWithSchema
): tool is IndexSearchToolDefinitionWithSchema;
export function isIndexSearchTool(tool: ToolDefinition): tool is IndexSearchToolDefinition;
export function isIndexSearchTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.index_search;
}
