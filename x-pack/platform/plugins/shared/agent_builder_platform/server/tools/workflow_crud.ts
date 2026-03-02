/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { otherResult, errorResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';

const createWorkflowSchema = z.object({
  yaml: z.string().describe('The workflow definition in YAML format'),
  confirm: z.literal(true).describe('Required. Must be true to create a workflow.'),
});

export const createWorkflowTool = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof createWorkflowSchema> => {
  const workflowApi = workflowsManagement.management;
  return {
    id: platformCoreTools.createWorkflow,
    type: ToolType.builtin,
    description: 'Create a new workflow from a YAML definition.',
    schema: createWorkflowSchema,
    confirmation: { askUser: 'once' },
    handler: async ({ yaml, confirm: _ }, { spaceId, request }) => {
      try {
        const workflow = await workflowApi.createWorkflow({ yaml }, spaceId, request);
        return { results: [otherResult({ operation: 'create', workflow })] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { results: [errorResult(`Failed to create workflow: ${message}`)] };
      }
    },
    tags: [],
  };
};

const updateWorkflowSchema = z.object({
  id: z.string().describe('The workflow ID to update'),
  yaml: z.string().optional().describe('Updated workflow YAML definition'),
  enabled: z.boolean().optional().describe('Enable or disable the workflow'),
  confirm: z.literal(true).describe('Required. Must be true to update a workflow.'),
});

export const updateWorkflowTool = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof updateWorkflowSchema> => {
  const workflowApi = workflowsManagement.management;
  return {
    id: platformCoreTools.updateWorkflow,
    type: ToolType.builtin,
    description:
      'Update an existing workflow by ID. Can update the YAML definition or enable/disable.',
    schema: updateWorkflowSchema,
    confirmation: { askUser: 'once' },
    handler: async ({ id, yaml, enabled, confirm: _ }, { spaceId, request }) => {
      try {
        const updatePayload: Record<string, unknown> = {};
        if (yaml !== undefined) updatePayload.yaml = yaml;
        if (enabled !== undefined) updatePayload.enabled = enabled;
        const workflow = await workflowApi.updateWorkflow(id, updatePayload, spaceId, request);
        return { results: [otherResult({ operation: 'update', workflow })] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { results: [errorResult(`Failed to update workflow: ${message}`)] };
      }
    },
    tags: [],
  };
};

const deleteWorkflowSchema = z.object({
  ids: z.array(z.string()).min(1).describe('Workflow ID(s) to delete'),
  confirm: z.literal(true).describe('Required. Must be true to delete workflow(s).'),
});

export const deleteWorkflowTool = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof deleteWorkflowSchema> => {
  const workflowApi = workflowsManagement.management;
  return {
    id: platformCoreTools.deleteWorkflow,
    type: ToolType.builtin,
    description: 'Delete one or more workflows by ID.',
    schema: deleteWorkflowSchema,
    confirmation: { askUser: 'once' },
    handler: async ({ ids, confirm: _ }, { spaceId, request }) => {
      try {
        const result = await workflowApi.deleteWorkflows(ids, spaceId, request);
        return { results: [otherResult({ operation: 'delete', ...result })] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { results: [errorResult(`Failed to delete workflow(s): ${message}`)] };
      }
    },
    tags: [],
  };
};
