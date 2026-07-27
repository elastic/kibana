/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/module_migration
import type { JSONSchema } from 'zod/v4/core/json-schema';

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
 * Source category of a tool call in a conversation.
 */
export enum ToolOrigin {
  registry = 'registry',
  inline = 'inline',
  internal = 'internal',
}

/**
 * Controls how often the user is prompted for confirmation when the agent calls a tool.
 *
 * - once:   prompt once per tool type for the entire conversation. After the user
 *           accepts (or rejects), all subsequent calls to the same tool reuse that
 *           response — including retries after failures.
 * - always: prompt on every individual tool call. Each invocation gets its own
 *           confirmation, even if it targets the same tool type.
 * - never:  skip confirmation entirely.
 */
export type ToolConfirmationPolicyMode = 'once' | 'always' | 'never';

export interface ToolConfirmationPolicy {
  /**
   * If true, will prompt the user for confirmation when the agent wants to execute the tool, before the actual execution.
   */
  askUser?: ToolConfirmationPolicyMode;
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
  /**
   * When true, this tool is only available when experimental features are enabled.
   */
  experimental: boolean;
  /**
   * Optional tool call policy to control tool call confirmation behavior
   */
  confirmation?: ToolConfirmationPolicy;
}

export interface ToolDefinitionWithSchema<
  TType extends ToolType = ToolType,
  TConfig extends object = Record<string, unknown>
> extends ToolDefinition<TType, TConfig> {
  /**
   * the JSON schema associated with this tool's input parameters.
   */
  schema: JSONSchema;
}
