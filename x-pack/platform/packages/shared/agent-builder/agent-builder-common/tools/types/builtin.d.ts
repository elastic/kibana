/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '../definition';
import { type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';
export interface BuiltinToolConfig {}
export type BuiltinToolDefinition = ToolDefinition<ToolType.builtin, BuiltinToolConfig>;
export type BuiltinToolDefinitionWithSchema = ToolDefinitionWithSchema<
  ToolType.builtin,
  BuiltinToolConfig
>;
export declare function isBuiltinTool(
  tool: ToolDefinitionWithSchema
): tool is BuiltinToolDefinitionWithSchema;
export declare function isBuiltinTool(tool: ToolDefinition): tool is BuiltinToolDefinition;
