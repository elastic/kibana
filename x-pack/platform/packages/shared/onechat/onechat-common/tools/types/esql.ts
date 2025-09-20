/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

/**
 * Common ES Field Types
 */
export enum EsqlToolFieldType {
  TEXT = 'text',
  KEYWORD = 'keyword',
  LONG = 'long',
  INTEGER = 'integer',
  DOUBLE = 'double',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  NESTED = 'nested',
}

export type EsqlToolFieldTypes = `${EsqlToolFieldType}`;

export interface EsqlToolParam {
  /**
   * The data types of the parameter. Must be one of these
   */
  type: EsqlToolFieldTypes;
  /**
   * Description of the parameter's purpose or expected values.
   */
  description: string;
}

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EsqlToolConfig = {
  query: string;
  params: Record<string, EsqlToolParam>;
};

export type EsqlToolDefinition = ToolDefinition<EsqlToolConfig>;
export type EsqlToolDefinitionWithSchema = ToolDefinitionWithSchema<EsqlToolConfig>;

export function isEsqlTool(tool: ToolDefinitionWithSchema): tool is EsqlToolDefinitionWithSchema;
export function isEsqlTool(tool: ToolDefinition): tool is EsqlToolDefinition;
export function isEsqlTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.esql;
}
