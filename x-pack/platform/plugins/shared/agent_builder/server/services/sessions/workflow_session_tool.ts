/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ReminderTriggerSubscription } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  getAgentFromRunContext,
  createOtherResult,
  createErrorResult,
} from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { executeWorkflow } from '../workflow/execute_workflow';
import type { SessionsStart } from './session_service';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const otherResult = (content: string) => ({ results: [createOtherResult({ content })] });
const errResult = (message: string) => ({ results: [createErrorResult(`Error: ${message}`)] });

const requireConversationId = (
  runContext: Parameters<typeof getAgentFromRunContext>[0]
): string => {
  const id = getAgentFromRunContext(runContext)?.conversationId;
  if (!id)
    throw new Error('session tools are only available inside a standing session conversation');
  return id;
};

const runWorkflowSchema = z.object({
  workflow_id: z.string().describe('ID of the workflow to run.'),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Input parameters to pass to the workflow.'),
  check_interval_seconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'How often (in seconds) to wake this session to check the workflow status. Default: 60. ' +
        'When the reminder fires, use the workflow status tool to check progress; ' +
        'if still running, set another reminder. Cancel the check subscription when done.'
    ),
});

// ---------------------------------------------------------------------------
// session.list_workflows
// ---------------------------------------------------------------------------

const listWorkflowsSchema = z.object({
  query: z.string().optional().describe('Free-text search to filter workflows by name.'),
  enabled_only: z
    .boolean()
    .optional()
    .describe('When true (default), only return enabled workflows.'),
});

const createListWorkflowsTool = (
  workflowApi: WorkflowApi
): BuiltinToolDefinition<typeof listWorkflowsSchema> => ({
  id: 'session.list_workflows',
  type: ToolType.builtin,
  tags: [],
  description:
    'List Kibana workflows available in the current space. ' +
    'Returns workflow IDs, names, descriptions, and enabled status. ' +
    'Use the returned id with session.run_workflow to start a workflow.',
  schema: listWorkflowsSchema,
  handler: async (params, context) => {
    try {
      const result = await workflowApi.getWorkflows(
        {
          size: 100,
          page: 1,
          enabled: params.enabled_only !== false ? [true] : undefined,
          query: params.query,
        },
        context.spaceId
      );
      const summary = result.results.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        enabled: w.enabled,
        valid: w.valid,
        tags: w.tags ?? [],
      }));
      return otherResult(JSON.stringify({ total: result.total, workflows: summary }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return errResult(`Could not list workflows: ${msg}`);
    }
  },
});

// ---------------------------------------------------------------------------
// session.run_workflow
// ---------------------------------------------------------------------------

/**
 * Creates both workflow-related session tools.
 * Kept separate from createSessionTools because they require workflowApi
 * from the plugin setup contract (not available in the shared package).
 */
export const createWorkflowSessionTools = (
  sessions: SessionsStart,
  workflowApi: WorkflowApi
): BuiltinToolDefinition[] => [
  createListWorkflowsTool(workflowApi),
  createRunWorkflowTool(sessions, workflowApi),
];

const createRunWorkflowTool = (
  sessions: SessionsStart,
  workflowApi: WorkflowApi
): BuiltinToolDefinition<typeof runWorkflowSchema> => ({
  id: 'session.run_workflow',
  type: ToolType.builtin,
  tags: [],
  description:
    'Start a Kibana workflow and subscribe this session to be notified when it completes. ' +
    'The workflow receives the current session ID as `__session_id__` so any ' +
    '`ai.send_session_message` step in the workflow can notify the session immediately. ' +
    'A reminder is also set automatically to poll for completion in case the workflow ' +
    'does not include a callback step. ' +
    'Returns the workflow execution ID and the check-subscription ID.',
  schema: runWorkflowSchema,
  handler: async (params, context) => {
    const conversationId = requireConversationId(context.runContext);
    const client = sessions.getScopedClient({ request: context.request });

    const workflowParams: Record<string, unknown> = {
      ...(params.params ?? {}),
      __session_id__: conversationId,
    };

    const result = await executeWorkflow({
      workflowId: params.workflow_id,
      workflowParams,
      request: context.request,
      spaceId: context.spaceId,
      workflowApi,
      waitForCompletion: false,
    });

    if (!result.success) {
      return errResult(result.error ?? 'Failed to start workflow');
    }

    const executionId = result.execution.execution_id;
    const intervalSeconds = params.check_interval_seconds ?? 60;
    const firesAt = new Date(Date.now() + intervalSeconds * 1000).toISOString();
    const subscriptionId = uuidv4();

    const subscription: ReminderTriggerSubscription = {
      id: subscriptionId,
      type: 'reminder_trigger',
      one_shot: true,
      config: {
        fires_at: firesAt,
        note: `workflow_check:${executionId}`,
      },
      task_id: '',
      created_at: new Date().toISOString(),
    };

    try {
      await client.addSubscription(conversationId, subscription);
    } catch (err) {
      // Non-fatal — the workflow still started; warn the agent it must poll manually.
      return otherResult(
        JSON.stringify({
          execution_id: executionId,
          check_subscription_id: null,
          warning:
            `Workflow started but could not set automatic check reminder: ${err}. ` +
            'Use session.set_reminder manually to poll for completion.',
        })
      );
    }

    return otherResult(
      JSON.stringify({
        execution_id: executionId,
        check_subscription_id: subscriptionId,
        check_at: firesAt,
        instructions:
          `Workflow started. A reminder fires in ${intervalSeconds}s. ` +
          'When the reminder note is "workflow_check:<id>", call the workflow status tool with that execution ID. ' +
          'If not yet complete, set another reminder via session.set_reminder. ' +
          'Once complete, call session.unsubscribe with the check_subscription_id (if it has not yet fired) ' +
          'and process the workflow result.',
      })
    );
  },
});
