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
import { stringify } from 'yaml';
import { confirmToolCall, hashDefinition } from './utils/confirm_tool_call';
import { formatCodeBlock } from './utils/code_block';
import { findUnsafeSteps, getWorkflowSteps, type UnsafeStep } from './utils/step_risk';

/** `execute_api` selectors for the same operations, so one auto-approval covers both tools. */
const RUN_PERSISTED_WORKFLOW_API = 'workflows.post-workflows-workflow-id-run';
const RUN_INLINE_WORKFLOW_API = 'workflows.post-workflows-test';
const MAX_LISTED_STEPS = 10;
const MAX_STEP_PARAMS_CHARS = 500;
const MAX_INPUTS_CHARS = 2000;

const formatStepParams = ({ step }: UnsafeStep): string[] => {
  const params = step.stepYamlNode.get('with');
  if (params == null) {
    return [];
  }
  const block = formatCodeBlock('yaml', stringify(params).trimEnd(), MAX_STEP_PARAMS_CHARS);
  return block.split('\n').map((line) => `  ${line}`);
};

const buildConfirmationMessage = ({
  unsafeSteps,
  inputs,
  showSteps,
}: {
  unsafeSteps: UnsafeStep[];
  inputs: Record<string, unknown>;
  /** False when the caller cannot read the definition: the steps stay hidden. */
  showSteps: boolean;
}): string => {
  const lines: string[] = [];
  if (showSteps) {
    lines.push(
      i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.message', {
        defaultMessage: 'This workflow has steps that can change data or call external services:',
      }),
      ''
    );
    for (const unsafeStep of unsafeSteps.slice(0, MAX_LISTED_STEPS)) {
      const { stepId, stepType } = unsafeStep.step;
      lines.push(`- \`${stepId}\` (\`${stepType}\`)`, ...formatStepParams(unsafeStep));
    }
    if (unsafeSteps.length > MAX_LISTED_STEPS) {
      lines.push(`- … ${unsafeSteps.length - MAX_LISTED_STEPS} more`);
    }
  } else {
    lines.push(
      i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.messageWithoutSteps', {
        defaultMessage: 'This workflow has steps that can change data or call external services.',
      })
    );
  }

  if (Object.keys(inputs).length > 0) {
    lines.push(
      '',
      i18n.translate('workflows.agentBuilder.executeWorkflow.confirmation.inputs', {
        defaultMessage: '**The agent will send:**',
      }),
      formatCodeBlock('json', JSON.stringify(inputs, null, 2), MAX_INPUTS_CHARS)
    );
  }
  return lines.join('\n');
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
  inputs,
}: {
  toolContext: ToolHandlerContext;
  workflowApi: WorkflowsServerPluginSetup['management'];
  getSecurity: () => SecurityPluginStart | undefined;
  yaml?: string;
  workflowId?: string;
  name?: string;
  inputs: Record<string, unknown>;
}) => {
  const { request, spaceId, interactivity } = toolContext;
  // Loaded once: the prompt key and the prompt must describe the same definition.
  let definition: Promise<{ persisted?: { name?: string }; workflowYaml?: string }> | undefined;
  const loadDefinition = () => {
    definition ??= (async () => {
      const persisted =
        yaml === undefined && workflowId
          ? await workflowApi.getWorkflow(workflowId, spaceId, request)
          : undefined;
      return { persisted: persisted ?? undefined, workflowYaml: yaml ?? persisted?.yaml };
    })();
    return definition;
  };

  return confirmToolCall({
    context: toolContext,
    toolId: platformCoreTools.executeWorkflow,
    api: yaml ? RUN_INLINE_WORKFLOW_API : RUN_PERSISTED_WORKFLOW_API,
    declinedMessage: 'The user declined to run this workflow. Do not retry it.',
    // A persisted workflow can change after the prompt; a changed definition asks again.
    getPromptKey: async () => {
      const { workflowYaml } = await loadDefinition();
      return workflowYaml === undefined ? undefined : hashDefinition(workflowYaml);
    },
    getPrompt: async () => {
      const { persisted, workflowYaml } = await loadDefinition();
      // An unknown workflow runs on, so the execution reports the error.
      if (workflowYaml === undefined) {
        return undefined;
      }
      const parsed = getWorkflowSteps(workflowYaml);
      // Steps that cannot be read are not known to be safe, so ask.
      const unsafeSteps = 'error' in parsed ? [] : findUnsafeSteps(parsed.steps, interactivity);
      if ('steps' in parsed && unsafeSteps.length === 0) {
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
        message:
          'error' in parsed
            ? i18n.translate(
                'workflows.agentBuilder.executeWorkflow.confirmation.unreadableSteps',
                {
                  defaultMessage: 'The steps of this workflow cannot be checked: {error}',
                  values: { error: parsed.error },
                }
              )
            : buildConfirmationMessage({ unsafeSteps, inputs, showSteps: canReadDefinition }),
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
};

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

**This tool can perform destructive and irreversible operations** — workflows may include steps that delete Elasticsearch indices or documents, post messages to Slack, make arbitrary HTTP requests, or perform other actions with external side effects. Always review the workflow steps before executing. In a conversation, the user confirms runs that include such steps; if they decline, do not retry. With no user to confirm (for example in an \`ai.agent\` workflow step), such runs are refused unless the run pre-approved the workflows API.

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
        inputs: workflowParams,
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
