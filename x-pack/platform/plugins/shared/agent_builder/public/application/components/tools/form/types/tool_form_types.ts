/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolFieldTypes, EsqlToolParamValue, ToolType } from '@kbn/agent-builder-common';

export interface EsqlParam {
  name: string;
  type: EsqlToolFieldTypes;
  description: string;
  optional: boolean;
  defaultValue?: EsqlToolParamValue;
}

export enum EsqlParamSource {
  Inferred = 'inferred',
  Custom = 'custom',
}

export type EsqlParamFormData = EsqlParam & {
  warning?: string;
  source: EsqlParamSource;
};

export interface BaseToolFormData {
  toolId: string;
  description: string;
  labels: string[];
}

export interface EsqlToolFormData extends BaseToolFormData {
  type: ToolType.esql;
  esql: string;
  params: EsqlParamFormData[];
}

export interface BuiltinToolFormData extends BaseToolFormData {
  type: ToolType.builtin;
}

export interface McpToolFormData extends BaseToolFormData {
  type: ToolType.mcp;
}

export interface IndexSearchToolFormData extends BaseToolFormData {
  type: ToolType.index_search;
  pattern: string;
  rowLimit?: number;
  customInstructions?: string;
}

export interface WorkflowToolFormData extends BaseToolFormData {
  type: ToolType.workflow;
  workflow_id: string;
  wait_for_completion: boolean;
}

export interface McpToolFormData extends BaseToolFormData {
  type: ToolType.mcp;
  connectorId: string;
  mcpToolName: string;
}

export type ToolFormData =
  | EsqlToolFormData
  | BuiltinToolFormData
  | IndexSearchToolFormData
  | WorkflowToolFormData
  | McpToolFormData;
