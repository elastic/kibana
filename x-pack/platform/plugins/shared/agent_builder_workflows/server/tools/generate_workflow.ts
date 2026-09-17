/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { generateWorkflow, type GenerateWorkflowEdit } from '@kbn/agent-builder-workflow-gen';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { workflowIdSchema } from '@kbn/workflows-management-plugin/common/lib/workflow_id_schema';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import type { WorkflowsAiTelemetryClient } from '../telemetry/workflows_ai_telemetry_client';
import { workflowTools } from '../../common/constants';
import { emitWorkflowDiff, extractConversationId } from './utils/workflow_attachments';

const generateWorkflowSchema = z.object({
  query: z
    .string()
    .describe('A natural-language description of the workflow to generate or what to update.'),
  attachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) When updating a workflow attached to the conversation, the ID of the corresponding workflow **attachment**.'
    ),
  context: z
    .string()
    .optional()
    .describe(
      '(optional) Specific grounding facts needed to generate the workflow — e.g. index names, field names/mappings, connector IDs, space IDs, alert field paths, time ranges, logical flow and/or filter requirements, etc.'
    ),
  instructions: z
    .string()
    .optional()
    .describe('(optional) Additional instructions to steer the generation (system-prompt extras).'),
  workflowId: workflowIdSchema
    .optional()
    .describe(
      '(optional) A unique workflow ID (lowercase alphanumeric and hyphens, 3-255 chars, matching /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/). ' +
        'Only used on creation (when no `attachmentId` is provided). When set, this ID is stored with the attachment and used as the persisted workflow ID on save. ' +
        'Use this when the workflow will be referenced by other resources (e.g. action policy destinations). On edits, the existing attachment workflowId is preserved.'
    ),
});

export const generateWorkflowTool = ({
  workflowsManagement,
  aiTelemetryClient,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
}): BuiltinToolDefinition<typeof generateWorkflowSchema> => {
  const { management: workflowsApi } = workflowsManagement;

  return {
    id: platformCoreTools.generateWorkflow,
    type: ToolType.builtin,
    description:
      cleanPrompt(`Generate or update an Elastic workflow definition based on a natural-language description.

Use this tool when:
— The user asks to create, draft or scaffold a new workflow.
– The user asks to edit an existing workflow.
— You want to generate a workflow to fulfill a specific multi-step task.

Do **not** use this tool for a one-off call to a single connector (e.g. "post this to Slack", "create this Jira issue") — that is not a workflow. Load the \`connector-discovery\` skill instead. This tool's knowledge of available connectors (below) is only for authoring workflow steps, not a substitute for connector-discovery.

## Which context to provide

Under the hood, the tool delegates to a workflow-generation specialized agent.

The workflow agent has innate knowledge of (meaning you don't need to gather information / provide those in the prompt):
— The workflow syntax and official documentation
— The available step types, their configuration and how to use them
— The list of available connector types
— The list of connectors available on the current Kibana instance
— When the 'attachmentId' parameter is specified, the corresponding workflow definition

The workflow agent has **no** knowledge of (meaning you may need to gather and pass additional context):
— Specific semantics referenced in the conversation: index names, field names/mappings, connector IDs, space IDs, alert field paths, time ranges, logical flow and/or filter requirements, etc, that the workflow needs. Pass only the relevant context as \`context\`.
— Elasticsearch cluster state: index names and their mappings when relevant to the workflow.

E.g., if the user message is "Ok now that we've identified that log index, now generate a workflow checking every 30mins for error in it and post a summary to slack in the foo channel", you should
1. Specify which index the workflow should be targeted (inferred from the conversation / previous messages)
2. Check the mappings of that index to provide guidance on how to identify errors
And you should **not**:
1. Try to list connectors, connector types,
2. Load the workflow-authoring skill to get more knowledge about the workflow syntax

## Usage notes

— If all you need is to generate a workflow, you do *NOT* need to read the "workflow-authoring" skill first, you can call this tool directly.
— Called by an Agent Builder, the tool returns workflow attachment references plus the instructions for presenting them.
— Called via MCP server, the tool returns the generated workflow YAML.

## Alert-triggered workflows

When the workflow is alert-triggered (\`type: alert\`), runtime alert data is exposed to Liquid expressions as \`event.*\` — NEVER \`triggers.event\` or \`trigger.event\` (the \`triggers\` block only configures which triggers fire the workflow; it does not carry runtime data). If the user's request names specific alert fields (rule name, severity, alert ID, tags, space), pass them in \`context\` using this schema so the generated Liquid resolves correctly:
— \`event.alerts\` — array of alert objects that fired
— \`event.alerts[0]._id\` / \`._index\` / \`.kibana.alert.*\` / \`["@timestamp"]\`
— \`event.rule.id\` / \`event.rule.name\` / \`event.rule.tags\`
— \`event.spaceId\` — the space where the event was emitted

    `),
    schema: generateWorkflowSchema,
    annotations: {
      title: 'Generate Workflow',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (
      { query, attachmentId, context: workflowContext, instructions, workflowId },
      toolContext
    ) => {
      const { modelProvider, logger, request, spaceId, attachments } = toolContext;
      const model = await modelProvider.getDefaultModel();

      const sourceAttachment = attachmentId ? attachments.get(attachmentId) : undefined;
      if (attachmentId && !sourceAttachment) {
        const workflowAttachmentIds = attachments
          .getActive()
          .filter((attachment) => attachment.type === WORKFLOW_YAML_ATTACHMENT_TYPE)
          .map((attachment) => attachment.id);
        const existingAttachmentHint =
          workflowAttachmentIds.length > 0
            ? ` Conversation workflow attachment ids: ${workflowAttachmentIds.join(', ')}.`
            : '';
        return {
          results: [
            errorResult(
              `Attachment with ID '${attachmentId}' not found.${existingAttachmentHint} To edit a saved workflow that is not yet in the conversation, call \`${workflowTools.getWorkflow}\` with \`attach: true\` first, then pass the returned \`attachmentId\` to this tool. Workflow ids from automation lists are not conversation attachment ids until attached.`
            ),
          ],
        };
      }
      if (sourceAttachment && sourceAttachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
        return {
          results: [
            errorResult(`Attachment with ID '${attachmentId}' is not a workflow attachment.`),
          ],
        };
      }

      const sourceData = sourceAttachment?.data.data as
        | { yaml?: string; workflowId?: string; name?: string }
        | undefined;

      let workflowDef: GenerateWorkflowEdit | undefined;
      if (sourceAttachment && sourceData?.yaml) {
        workflowDef = {
          yaml: sourceData.yaml,
        };
      }

      try {
        const {
          workflow,
          yaml: afterYaml,
          response: generationComment,
        } = await generateWorkflow({
          nlQuery: query,
          workflow: workflowDef,
          additionalContext: workflowContext,
          additionalInstructions: instructions,
          model,
          logger,
          request,
          spaceId,
          workflowsApi,
        });

        const beforeYaml = sourceData?.yaml ?? '';
        const proposalId = v4();

        const {
          attachmentId: workflowAttachmentId,
          diffAttachmentId,
          attachmentVersion,
        } = await emitWorkflowDiff(toolContext, sourceAttachment?.id, {
          beforeYaml,
          afterYaml,
          proposalId,
          workflowId: sourceData?.workflowId ?? workflowId,
          name: workflow.name,
          description: `Diff for workflow '${workflow.name}'`,
          toolId: platformCoreTools.generateWorkflow,
        });

        aiTelemetryClient.reportEditResult({
          toolId: platformCoreTools.generateWorkflow,
          conversationId: extractConversationId(toolContext),
          editSuccess: true,
          isCreation: !sourceAttachment,
        });

        // Only an Agent Builder agent can resolve attachment IDs and render attachment
        // tags. Every other caller (MCP clients, the public `tools/_execute` API, the
        // CLI) gets the YAML itself.
        const isAgentBuilderCall = toolContext.callContext.callSource === 'agent';

        return {
          results: [
            otherResult({
              comment: generationComment,
              success: true,
              ...(isAgentBuilderCall
                ? {
                    // In Agent Builder the YAML lives in the attachment, so keep it out
                    // of the model context — only the IDs to reference it are returned.
                    attachment_id: workflowAttachmentId,
                    attachment_version: attachmentVersion,
                    proposal_id: proposalId,
                    diff_attachment_id: diffAttachmentId,
                    presentation: `Render the diff with "<render_attachment id="${diffAttachmentId}"/>" and the workflow with "<render_attachment id="${workflowAttachmentId}" version="${attachmentVersion}"/>".`,
                  }
                : { yaml: afterYaml }),
              ...(sourceAttachment ? { updated: true } : { created: true }),
            }),
          ],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);

        aiTelemetryClient.reportEditResult({
          toolId: platformCoreTools.generateWorkflow,
          conversationId: extractConversationId(toolContext),
          editSuccess: false,
          isCreation: !sourceAttachment,
        });

        return {
          results: [errorResult(message)],
        };
      }
    },
    tags: [],
  };
};
