/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server';
import { i18n } from '@kbn/i18n';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { workflowIdSchema } from '@kbn/workflows-management-plugin/common/lib/workflow_id_schema';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import {
  executeWorkflow,
  hasWorkflowExecutePrivilege,
  hasWorkflowReadPrivilege,
} from '@kbn/agent-builder-tools-base/workflows';
import { confirmToolCall } from './utils/confirm_tool_call';
import { findUnsafeSteps, getWorkflowSteps, type UnsafeStep } from './utils/step_risk';

/** `execute_api` selectors for the same operations, so one auto-approval covers both tools. */
const RUN_PERSISTED_WORKFLOW_API = 'workflows.post-workflows-workflow-id-run';
const RUN_INLINE_WORKFLOW_API = 'workflows.post-workflows-test';
const MAX_LISTED_STEPS = 10;

const buildConfirmationMessage = (unsafeSteps: UnsafeStep[]): string => {
  const listed = unsafeSteps
    .slice(0, MAX_LISTED_STEPS)
    .map(({ step }) => `- \`${step.stepId}\` (\`${step.stepType}\`)`);
  if (unsafeSteps.length > MAX_LISTED_STEPS) {
    listed.push(`- … ${unsafeSteps.length - MAX_LISTED_STEPS} more`);
  }
  return [
    i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.message', {
      defaultMessage: 'This workflow has steps that can change data or call external services:',
    }),
    '',
    ...listed,
  ].join('\n');
};

const executeWorkflowSchema = z.object({
  workflowId: workflowIdSchema.optional().describe('ID of a persisted workflow to execute.'),
  yaml: z.string().optional().describe('Inline workflow YAML definition to execute.'),
  attachmentId: z.string().optional().describe('ID of a workflow attachment to execute.'),
  inputs: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Workflow inputs object. Must conform to the inputs schema declared by the workflow. When uncertain, inspect the workflow YAML before calling.'
    ),
  waitForCompletion: z
    .boolean()
    .optional()
    .describe(
      '(Optional, default true) When true, wait for the execution to complete synchronously. When false, return immediately with an executionId (fire and forget)'
    ),
});

/** Asks the user to confirm a run that has steps which are not safe. */
const confirmRun = ({
  toolContext,
  workflowApi,
  getSecurity,
  yaml,
  workflowId,
  name,
}: {
  toolContext: ToolHandlerContext;
  workflowApi: WorkflowsServerPluginSetup['management'];
  getSecurity: () => SecurityPluginStart | undefined;
  yaml?: string;
  workflowId?: string;
  name?: string;
}) =>
  confirmToolCall({
    context: toolContext,
    toolId: platformCoreTools.executeWorkflow,
    api: yaml ? RUN_INLINE_WORKFLOW_API : RUN_PERSISTED_WORKFLOW_API,
    declinedMessage: 'The user declined to run this workflow. Do not retry it.',
    getPrompt: async () => {
      const { request, spaceId, interactivity } = toolContext;
      const persisted =
        yaml === undefined && workflowId
          ? await workflowApi.getWorkflow(workflowId, spaceId, request)
          : undefined;
      const workflowYaml = yaml ?? persisted?.yaml;
      // An unknown workflow runs on, so the execution reports the error.
      const unsafeSteps = workflowYaml
        ? findUnsafeSteps(getWorkflowSteps(workflowYaml), interactivity)
        : [];
      if (unsafeSteps.length === 0) {
        return undefined;
      }

      // Execute and read are separate privileges, so an execute-only caller sees no step details.
      const canReadDefinition =
        persisted === undefined ||
        (await hasWorkflowReadPrivilege({ security: getSecurity(), request, spaceId }));
      const workflowName = name ?? (canReadDefinition ? persisted?.name : undefined) ?? workflowId;
      return {
        title: workflowName
          ? i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.title', {
              defaultMessage: 'Run workflow "{workflowName}"?',
              values: { workflowName },
            })
          : i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.titleInline', {
              defaultMessage: 'Run inline workflow?',
            }),
        message: canReadDefinition
          ? buildConfirmationMessage(unsafeSteps)
          : i18n.translate(
              'workflows.agentBuilder.executeWorkflow.confirmation.messageWithoutSteps',
              {
                defaultMessage:
                  'This workflow has steps that can change data or call external services.',
              }
            ),
        confirm_text: i18n.translate(
          'workflows.agentBuilder.executeWorkflow.confirmation.confirmText',
          { defaultMessage: 'Run workflow' }
        ),
        cancel_text: i18n.translate(
          'workflows.agentBuilder.executeWorkflow.confirmation.cancelText',
          { defaultMessage: 'Cancel' }
        ),
        color: unsafeSteps.some(({ risk }) => risk.destructive) ? 'danger' : 'warning',
      };
    },
  });

export const executeWorkflowTool = ({
  workflowsManagement,
  getSecurity,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
  getSecurity: () => SecurityPluginStart | undefined;
}): BuiltinToolDefinition<typeof executeWorkflowSchema> => {
  const { management: workflowApi } = workflowsManagement;

  return {
    id: platformCoreTools.executeWorkflow,
    type: ToolType.builtin,
    description: cleanPrompt(`Execute an Elastic workflow.

Use this tool when:
— The user asks to run, trigger or execute a workflow.
— You need to run a workflow you just generated (e.g. via \`generate_workflow\`).

**This tool can perform destructive and irreversible operations** — workflows may include steps that delete Elasticsearch indices or documents, post messages to Slack, make arbitrary HTTP requests, or perform other actions with external side effects. Always review the workflow steps before executing. In a conversation, the user confirms runs that include such steps; if they decline, do not retry.

## Source — exactly one must be provided

- \`workflowId\`: a persisted workflow id (the workflow must be saved and enabled).
- \`yaml\`: an inline YAML workflow definition; runs ephemerally (no persistence).
- \`attachmentId\`: the id of a workflow YAML attachment already in this conversation (as returned by \`generate_workflow\`).

Providing zero or more than one will return an error.

## Inputs

Pass workflow inputs in \`inputs\`. Make sure the keys/types match the workflow's declared inputs schema.
If the workflow has no inputs, omit \`inputs\` or pass \`{}\`.

## Wait behaviour

\`waitForCompletion\` defaults to \`true\` (up to 120s).
If set to false, or if the workflow does not complete within the timeout, the tool returns the in-flight execution and you can poll via \`${platformCoreTools.getWorkflowExecutionStatus}\`.

## Follow-ups

- If the returned execution status is \`waiting_for_input\`, the workflow is paused; resume it with \`${platformCoreTools.resumeWorkflowExecution}\`.
- If the status is not terminal (still running), call \`${platformCoreTools.getWorkflowExecutionStatus}\` later to get the final outcome.

## API documentation
- Workflows guide: https://www.elastic.co/docs/explore-analyze/workflows
- Workflows API: https://www.elastic.co/docs/api/doc/kibana/group/endpoint-workflows
`),
    schema: executeWorkflowSchema,
    annotations: {
      title: 'Execute Workflow',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    handler: async ({ workflowId, yaml, attachmentId, inputs, waitForCompletion }, toolContext) => {
      const providedModes = [workflowId, yaml, attachmentId].filter((v) => v !== undefined).length;
      if (providedModes !== 1) {
        return {
          results: [
            errorResult('Exactly one of `workflowId`, `yaml`, or `attachmentId` must be provided.'),
          ],
        };
      }

      let resolvedYaml: string | undefined = yaml;
      let resolvedWorkflowId: string | undefined = workflowId;
      let resolvedName: string | undefined;

      if (attachmentId) {
        const attachment = toolContext.attachments.get(attachmentId);
        if (!attachment) {
          return {
            results: [errorResult(`Attachment with ID '${attachmentId}' not found.`)],
          };
        }
        if (attachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
          return {
            results: [
              errorResult(`Attachment with ID '${attachmentId}' is not a workflow attachment.`),
            ],
          };
        }
        const data = attachment.data.data as
          | { yaml?: string; workflowId?: string; name?: string }
          | undefined;
        if (!data?.yaml) {
          return {
            results: [
              errorResult(`Attachment with ID '${attachmentId}' does not contain a YAML payload.`),
            ],
          };
        }
        resolvedYaml = data.yaml;
        resolvedWorkflowId = data.workflowId;
        resolvedName = data.name;
      }

      const { request, spaceId } = toolContext;
      const workflowParams = inputs ?? {};
      const wait = waitForCompletion ?? true;

      const canExecute = await hasWorkflowExecutePrivilege({
        security: getSecurity(),
        request,
        spaceId,
      });
      if (!canExecute) {
        return {
          results: [
            errorResult(
              "Unauthorized to execute workflow. The 'workflowsManagement' execute privilege is required."
            ),
          ],
        };
      }

      const confirmation = await confirmRun({
        toolContext,
        workflowApi,
        getSecurity,
        yaml: resolvedYaml,
        workflowId: resolvedWorkflowId,
        name: resolvedName,
      });
      if (confirmation) {
        return confirmation;
      }

      const result = resolvedYaml
        ? await executeWorkflow({
            yaml: resolvedYaml,
            workflowId: resolvedWorkflowId,
            name: resolvedName,
            workflowParams,
            request,
            spaceId,
            workflowApi,
            waitForCompletion: wait,
          })
        : await executeWorkflow({
            workflowId: resolvedWorkflowId as string,
            workflowParams,
            request,
            spaceId,
            workflowApi,
            waitForCompletion: wait,
          });

      if (result.success) {
        return {
          results: [otherResult({ execution: result.execution })],
        };
      }

      return {
        results: [errorResult(result.error)],
      };
    },
    tags: [],
  };
};
