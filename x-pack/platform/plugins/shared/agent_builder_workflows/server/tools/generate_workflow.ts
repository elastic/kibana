/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { generateWorkflow, type GenerateWorkflowEdit } from '@kbn/agent-builder-workflow-gen';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';

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
      '(optional) Additional context that could be useful to generate the workflow (e.g. related conversation, environment hints).'
    ),
  instructions: z
    .string()
    .optional()
    .describe('(optional) Additional instructions to steer the generation (system-prompt extras).'),
});

export const generateWorkflowTool = ({
  workflowsManagement,
}: {
  workflowsManagement: WorkflowsServerPluginSetup;
}): BuiltinToolDefinition<typeof generateWorkflowSchema> => {
  const { management: workflowsApi } = workflowsManagement;

  return {
    id: platformCoreTools.generateWorkflow,
    type: ToolType.builtin,
    experimental: true,
    description:
      cleanPrompt(`Generate or update an Elastic workflow definition based on a natural-language description.

Use this tool when:
— The user asks to create, draft or scaffold a new workflow.
– The user asks to edit an existing workflow.
— You want to generate a workflow to fulfill a specific multi-step task.

## Which context to provide

Under the hood, the tool delegates to a workflow-generation specialized agent.

The workflow agent has innate knowledge of (meaning you don't need to gather information / provide those in the prompt):
— The workflow syntax and official documentation
— The available step types, their configuration and how to use them
— The list of available connector types
— The list of connectors available on the current Kibana instance
— When the 'attachmentId' parameter is specified, the corresponding workflow definition

The workflow agent has **no** knowledge of (meaning you need to provide or eventually gather info about):
— The current conversation (meaning that if information useful for the workflow generation is present in the conversation, you should explicitly summarize those and mention then as context when calling the tool)
— Any info related to the state of the Elasticsearch cluster (available indices, their mappings...)

E.g., if the user message is "Ok now that we've identified that log index, now generate a workflow checking every 30mins for error in it and post a summary to slack in the foo channel", you should
1. Specify which index the workflow should be targeted (inferred from the conversation / previous messages)
2. Check the mappings of that index to provide guidance on how to identify errors
And you should **not**:
1. Try to list connectors, connector types,
2. Load the workflow-authoring skill to get more knowledge about the workflow syntax

## Usage notes

— If all you need is to generate a workflow, you do *NOT* need to read the "workflow-authoring" skill first, you can call this tool directly.
— The tool creates (or updates) a workflow attachment, and returns the attachment Id and version.
— You can render the workflow with "<render_attachment id="{attachmentId}" version="{attachmentVersion}"/>".

    `),
    schema: generateWorkflowSchema,
    handler: async (
      { query, attachmentId, context, instructions },
      { modelProvider, logger, request, spaceId, attachments }
    ) => {
      const model = await modelProvider.getDefaultModel();

      const sourceAttachment = attachmentId ? attachments.get(attachmentId) : undefined;
      if (attachmentId && !sourceAttachment) {
        return {
          results: [errorResult(`Attachment with ID '${attachmentId}' not found.`)],
        };
      }
      if (sourceAttachment && sourceAttachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
        return {
          results: [
            errorResult(`Attachment with ID '${attachmentId}' is not a workflow attachment.`),
          ],
        };
      }

      // Workflow attachments carry { yaml, workflowId?, name? } in their data
      // payload. workflowId is the link to the persisted workflow on disk —
      // we must propagate it across edits so subsequent "save" operations
      // from the UI keep targeting the same workflow.
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
        const { workflow, response: generationComment } = await generateWorkflow({
          nlQuery: query,
          workflow: workflowDef,
          additionalContext: context,
          additionalInstructions: instructions,
          model,
          logger,
          request,
          spaceId,
          workflowsApi,
        });

        const attachmentData = {
          name: workflow.name,
          yaml: stringifyWorkflowDefinition(workflow),
          // Preserve the link to the persisted workflow on disk when
          // editing an existing attachment.
          ...(sourceData?.workflowId ? { workflowId: sourceData.workflowId } : {}),
        };

        const newAttachment = sourceAttachment
          ? await attachments.update(sourceAttachment.id, { data: attachmentData })
          : await attachments.add({
              type: WORKFLOW_YAML_ATTACHMENT_TYPE,
              data: attachmentData,
            });

        return {
          results: [
            otherResult({
              attachment_id: newAttachment!.id,
              attachment_version: newAttachment!.current_version,
              comment: generationComment,
              success: true,
              ...(sourceAttachment ? { updated: true } : { created: true }),
            }),
          ],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          results: [errorResult(message)],
        };
      }
    },
    tags: [],
  };
};
