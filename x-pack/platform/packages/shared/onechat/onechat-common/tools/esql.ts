/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from './definition';

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

export interface EsqlToolConfig {
  query: string;
  params: Record<string, EsqlToolParam>;
}

export type EsqlToolDefinition = ToolDefinition<EsqlToolConfig>;
