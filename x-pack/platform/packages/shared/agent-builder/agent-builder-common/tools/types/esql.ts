/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

/**
 * Current configuration schema version for persisted ES|QL tools.
 */
export const ESQL_CONFIG_SCHEMA_VERSION = 2;

/**
 * Common ES Field Types
 */
export enum EsqlToolFieldType {
  INTEGER = 'integer',
  STRING = 'string',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
}

export type EsqlToolFieldTypes = `${EsqlToolFieldType}`;

/**
 * Valid types for parameter values and default values
 */
export type EsqlToolParamValue = string | number | boolean | string[] | number[];

export interface EsqlToolParam {
  /**
   * The data types of the parameter. Must be one of these
   */
  type: EsqlToolFieldTypes;
  /**
   * Description of the parameter's purpose or expected values.
   */
  description: string;
  /**
   * Whether the parameter is optional.
   */
  optional?: boolean;
  /**
   * Default value for the parameter when it's optional and not provided.
   * Must be compatible with the parameter's type (see EsqlToolParamValue).
   */
  defaultValue?: EsqlToolParamValue;
}

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EsqlToolConfig = {
  query: string;
  params: Record<string, EsqlToolParam>;
};

export type EsqlToolDefinition = ToolDefinition<ToolType.esql, EsqlToolConfig>;
export type EsqlToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.esql, EsqlToolConfig>;

export function isEsqlTool(tool: ToolDefinitionWithSchema): tool is EsqlToolDefinitionWithSchema;
export function isEsqlTool(tool: ToolDefinition): tool is EsqlToolDefinition;
export function isEsqlTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.esql;
}
