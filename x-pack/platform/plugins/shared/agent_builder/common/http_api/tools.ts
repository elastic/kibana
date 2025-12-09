/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolDefinition,
  ToolDefinitionWithSchema,
  SerializedAgentBuilderError,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolTypeInfo } from '../tools';

export interface ListToolsResponse {
  results: ToolDefinition[];
}

export type GetToolResponse = ToolDefinitionWithSchema;

export interface DeleteToolResponse {
  success: boolean;
}

export type CreateToolPayload = Omit<ToolDefinition, 'description' | 'tags' | 'readonly'> &
  Partial<Pick<ToolDefinition, 'description' | 'tags'>>;

export type UpdateToolPayload = Partial<Pick<ToolDefinition, 'description' | 'tags'>> & {
  configuration?: Partial<ToolDefinition['configuration']>;
};

export type CreateToolResponse = ToolDefinitionWithSchema;

export type UpdateToolResponse = ToolDefinitionWithSchema;

interface BulkDeleteToolResultBase {
  toolId: string;
}

interface BulkDeleteToolSuccessResult extends BulkDeleteToolResultBase {
  success: true;
}

interface BulkDeleteToolFailureResult extends BulkDeleteToolResultBase {
  success: false;
  reason: SerializedAgentBuilderError;
}

export type BulkDeleteToolResult = BulkDeleteToolSuccessResult | BulkDeleteToolFailureResult;

export interface BulkDeleteToolResponse {
  results: BulkDeleteToolResult[];
}

export interface ExecuteToolResponse {
  results: ToolResult[];
}

export interface ResolveSearchSourcesRequest {
  pattern: string;
}

export interface ResolveSearchSourceItem {
  type: 'index' | 'alias' | 'data_stream';
  name: string;
}

export interface ResolveSearchSourcesResponse {
  results: ResolveSearchSourceItem[];
  total: number;
}

export interface WorkflowItem {
  id: string;
  name: string;
  description: string;
}

export interface GetWorkflowResponse {
  id: string;
  name: string;
  description?: string;
}

export interface ListWorkflowsResponse {
  results: WorkflowItem[];
}

export interface GetToolTypeInfoResponse {
  toolTypes: ToolTypeInfo[];
}
