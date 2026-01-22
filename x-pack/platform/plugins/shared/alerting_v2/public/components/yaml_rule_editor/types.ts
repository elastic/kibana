/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLCallbacks } from '@kbn/esql-types';

/**
 * Context information for ES|QL query within YAML
 */
export interface QueryContext {
  /** The matched property name (e.g., 'query') */
  propertyName: string;
  /** The ES|QL query text */
  queryText: string;
  /** The cursor offset within the query text */
  queryOffset: number;
}

/**
 * Schema property information extracted from JSON schema
 */
export interface SchemaPropertyInfo {
  key: string;
  description?: string;
  /** Formatted type string for display (e.g., "string", "number", "string[]", '"a" | "b"') */
  type: string;
  isEnum?: boolean;
  enumValues?: string[];
}

/**
 * JSON Schema type definition
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  description?: string;
  enum?: Array<string | number | boolean>;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;
  default?: unknown;
}

/**
 * Completion context for YAML editing
 */
export interface CompletionContext {
  parentPath: string[];
  currentKey: string | null;
  isValuePosition: boolean;
}

/**
 * Default property names that should be treated as ES|QL queries
 */
export const DEFAULT_ESQL_PROPERTY_NAMES = ['query'];

/**
 * Props for the YamlRuleEditor component
 */
export interface YamlRuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  esqlCallbacks: ESQLCallbacks;
  /**
   * Property names in YAML that should be treated as ES|QL queries.
   * Values of these properties will get ES|QL syntax highlighting and auto-completion.
   * @default ['query']
   */
  esqlPropertyNames?: string[];
  isReadOnly?: boolean;
  height?: number;
  dataTestSubj?: string;
}
