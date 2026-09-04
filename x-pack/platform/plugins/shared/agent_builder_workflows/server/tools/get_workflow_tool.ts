/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { hasWorkflowReadPrivilege } from '@kbn/agent-builder-tools-base/workflows';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { workflowIdSchema } from '@kbn/workflows-management-plugin/common/lib/workflow_id_schema';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import { workflowTools } from '../../common/constants';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface SavedWorkflowSnapshot {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  yaml: string;
}

export const attachSavedWorkflowToConversation = async ({
  workflowId,
  workflow,
  attachments,
}: {
  workflowId: string;
  workflow: SavedWorkflowSnapshot;
  attachments: AttachmentStateManager;
}): Promise<
  { attachmentId: string; reusedExistingAttachment: boolean } | { errorMessage: string }
> => {
  const existingAttachment = attachments.getAttachmentRecord(workflowId);

  if (existingAttachment) {
    if (existingAttachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
      return {
        errorMessage: `Attachment with ID '${workflowId}' already exists but is not a workflow attachment.`,
      };
    }

    if (!existingAttachment.origin) {
      await attachments.updateOrigin(workflowId, workflowId, ATTACHMENT_REF_ACTOR.agent);
    }

    return { attachmentId: workflowId, reusedExistingAttachment: true };
  }

  await attachments.add(
    {
      id: workflowId,
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      data: {
        yaml: workflow.yaml,
        workflowId: workflow.id,
        name: workflow.name,
      },
      origin: workflowId,
      description: workflow.name,
    },
    ATTACHMENT_REF_ACTOR.agent
  );

  return { attachmentId: workflowId, reusedExistingAttachment: false };
};

export function registerGetWorkflowTool(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi,
  getSecurity: () => SecurityPluginStart | undefined
): void {
  agentBuilder.tools.register({
    id: workflowTools.getWorkflow,
    type: ToolType.builtin,
    // Read of a saved workflow; `attach` only writes conversation-local scratch state.
    annotations: {
      title: 'Get workflow',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `Retrieve a saved workflow by id from the current Kibana space.

Use this tool when you need metadata (name, description, enabled state) about an existing workflow,
or — when \`includeYaml\` is true — the full workflow YAML definition in the tool result only.

**When to use \`includeYaml: false\` (default):** Listing or comparing existing automations by title
and description without loading full definitions.

**When to use \`includeYaml: true\` (without \`attach\`):** The user asked to review an existing workflow,
or you need a YAML-level duplicate check before creating a new automation. This does **not** add the
workflow to the conversation.

**When to use \`attach: true\`:** The user chose to **edit** a saved workflow that is not yet represented
as a \`workflow.yaml\` conversation attachment. This creates (or reuses) a workflow attachment whose
\`attachmentId\` equals the workflow id and sets \`origin\` so later saves update the existing workflow.
Then call \`platform.core.generate_workflow\` with that \`attachmentId\`. Do **not** pass a workflow id
from an automation list directly to \`generate_workflow\` unless it was attached first.`,
    schema: z.object({
      workflowId: workflowIdSchema.describe('The id of the workflow to retrieve.'),
      includeYaml: z
        .boolean()
        .optional()
        .describe(
          'When true, include the full workflow YAML in the tool result. Defaults to false to save tokens — only id, name, description, and enabled are returned.'
        ),
      attach: z
        .boolean()
        .optional()
        .describe(
          'When true, add or reuse a workflow.yaml conversation attachment for this saved workflow (id = workflowId, origin set for updates). Use before calling generate_workflow to edit a saved workflow. Defaults to false.'
        ),
    }),
    tags: ['workflows', 'yaml'],
    handler: async ({ workflowId, includeYaml, attach }, { spaceId, request, attachments }) => {
      const canRead = await hasWorkflowReadPrivilege({
        security: getSecurity(),
        request,
        spaceId,
      });

      if (!canRead) {
        return {
          results: [
            errorResult(
              `Unauthorized to read workflow '${workflowId}'. The workflowsManagement read privilege is required.`
            ),
          ],
        };
      }

      const workflow = await api.getWorkflow(workflowId, spaceId);

      if (!workflow) {
        return {
          results: [errorResult(`Workflow '${workflowId}' was not found in this space.`)],
        };
      }

      const response: Record<string, unknown> = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? '',
        enabled: workflow.enabled,
      };

      if (includeYaml === true) {
        response.yaml = workflow.yaml;
      }

      if (attach === true) {
        const attachResult = await attachSavedWorkflowToConversation({
          workflowId,
          workflow,
          attachments,
        });

        if ('errorMessage' in attachResult) {
          return {
            results: [errorResult(attachResult.errorMessage)],
          };
        }

        response.attachmentId = attachResult.attachmentId;
        response.reusedExistingAttachment = attachResult.reusedExistingAttachment;
      }

      return {
        results: [otherResult(response)],
      };
    },
  });
}
