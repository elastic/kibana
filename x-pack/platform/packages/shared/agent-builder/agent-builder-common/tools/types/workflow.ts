/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';

// To make compatible with ToolDefinition['configuration']
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WorkflowToolConfig = {
  workflow_id: string;
  wait_for_completion?: boolean;
};

export const WAIT_FOR_COMPLETION_TIMEOUT_SEC = 120;

export type WorkflowToolDefinition = ToolDefinition<ToolType.workflow, WorkflowToolConfig>;
export type WorkflowToolDefinitionWithSchema = ToolDefinitionWithSchema<
  ToolType.workflow,
  WorkflowToolConfig
>;

export function isWorkflowTool(
  tool: ToolDefinitionWithSchema
): tool is WorkflowToolDefinitionWithSchema;
export function isWorkflowTool(tool: ToolDefinition): tool is WorkflowToolDefinition;
export function isWorkflowTool(tool: ToolDefinition): boolean {
  return tool.type === ToolType.workflow;
}
