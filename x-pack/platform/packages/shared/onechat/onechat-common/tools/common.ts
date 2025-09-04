/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from './definition';
import type { EsqlToolDefinition, EsqlToolDefinitionWithSchema } from './esql';
import type {
  IndexSearchToolDefinition,
  IndexSearchToolDefinitionWithSchema,
} from './index_search';

export function isPersistedTool(
  tool: ToolDefinitionWithSchema
): tool is EsqlToolDefinitionWithSchema | IndexSearchToolDefinitionWithSchema;
export function isPersistedTool(
  tool: ToolDefinition
): tool is EsqlToolDefinition | IndexSearchToolDefinition;
export function isPersistedTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.esql || tool.type === ToolType.index_search;
}
