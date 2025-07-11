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
}

// TODO: rename to tool definition
/**
 * Serializable representation of a tool, without its handler or schema.
 *
 * Use as a common base for browser-side and server-side tool types.
 */
export interface ToolDescriptor<TConfig extends object = Record<string, unknown>> {
  /**
   * A unique id for this tool.
   */
  id: string;
  /**
   * The type of the tool
   */
  type: ToolType;
  /**
   * The description for this tool, which will be exposed to the LLM.
   */
  description: string;
  /**
   * Optional list of tags attached to this tool.
   * For built-in tools, this is specified during registration.
   */
  tags: string[];
  /**
   * The type-specific configuration for this tool.
   */
  configuration: TConfig;
}

// TODO: per-type config types configuration

export interface ToolDescriptorWithSchema extends ToolDescriptor {
  /**
   * the JSON schema associated with this tool's input parameters.
   */
  schema: JsonSchema7ObjectType;
}
