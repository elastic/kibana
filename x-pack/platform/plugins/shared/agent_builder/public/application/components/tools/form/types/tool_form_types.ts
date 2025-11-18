/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolFieldTypes, ToolType } from '@kbn/agent-builder-common';

export interface EsqlParam {
  name: string;
  type: EsqlToolFieldTypes;
  description: string;
  optional: boolean;
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

export interface IndexSearchToolFormData extends BaseToolFormData {
  type: ToolType.index_search;
  pattern: string;
}

export interface WorkflowToolFormData extends BaseToolFormData {
  type: ToolType.workflow;
  workflow_id: string;
}

export type ToolFormData =
  | EsqlToolFormData
  | BuiltinToolFormData
  | IndexSearchToolFormData
  | WorkflowToolFormData;
