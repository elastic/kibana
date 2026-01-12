/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BuiltinToolConfig = {};

export type BuiltinToolDefinition = ToolDefinition<ToolType.builtin, BuiltinToolConfig>;
export type BuiltinToolDefinitionWithSchema = ToolDefinitionWithSchema<
  ToolType.builtin,
  BuiltinToolConfig
>;

export function isBuiltinTool(
  tool: ToolDefinitionWithSchema
): tool is BuiltinToolDefinitionWithSchema;
export function isBuiltinTool(tool: ToolDefinition): tool is BuiltinToolDefinition;
export function isBuiltinTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.builtin;
}
