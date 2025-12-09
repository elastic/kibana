/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema7ObjectType } from 'zod-to-json-schema';

/**
 * Possible types of tools
 */
export enum ToolType {
  /**
   * Built-in tools - always available, statically registered tools.
   */
  builtin = 'builtin',
  /**
   * Tools based on ES|QL templates
   */
  esql = 'esql',
  /**
   * Workflow tools
   */
  workflow = 'workflow',
  /**
   * Index search tools
   */
  index_search = 'index_search',
  /**
   * MCP server tools
   */
  mcp = 'mcp',
}

/**
 * Serializable representation of a tool, without its handler or schema.
 *
 * Use as a common base for browser-side and server-side tool types.
 */
export interface ToolDefinition<
  TType extends ToolType = ToolType,
  TConfig extends object = Record<string, unknown>
> {
  /**
   * A unique id for this tool.
   */
  id: string;
  /**
   * The type of the tool
   */
  type: TType;
  /**
   * The description for this tool, which will be exposed to the LLM.
   */
  description: string;
  /**
   * Indicate whether this tool is editable by users or not.
   */
  readonly: boolean;
  /**
   * Optional list of tags attached to this tool.
   */
  tags: string[];
  /**
   * The type-specific configuration for this tool.
   */
  configuration: TConfig;
}

export interface ToolDefinitionWithSchema<
  TType extends ToolType = ToolType,
  TConfig extends object = Record<string, unknown>
> extends ToolDefinition<TType, TConfig> {
  /**
   * the JSON schema associated with this tool's input parameters.
   */
  schema: JsonSchema7ObjectType;
}
