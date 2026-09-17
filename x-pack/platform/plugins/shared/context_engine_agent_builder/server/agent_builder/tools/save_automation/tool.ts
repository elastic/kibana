/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { hasWorkflowReadPrivilege } from '@kbn/agent-builder-tools-base/workflows';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import { validateAiIndexId } from '@kbn/context-engine-plugin/common/validation';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import {
  getSaveAutomationErrorMessage,
  saveAutomationHandler,
  tryResolveAiIndexDisplayLabelFromAttachments,
  tryResolveWorkflowDisplayNameById,
  tryResolveWorkflowDisplayNameFromAttachments,
} from './handler';

const MAX_ATTACHMENT_ID_LENGTH = 256;

const saveAutomationSchema = z
  .object({
    workflowAttachmentId: z
      .string()
      .min(1)
      .max(MAX_ATTACHMENT_ID_LENGTH)
      .optional()
      .describe(
        'Conversation attachment id of the generated workflow (from generate_workflow attachment_id). Saves the YAML and attaches it to the AI index.'
      ),
    workflowId: z
      .string()
      .min(1)
      .max(MAX_AI_INDEX_AUTOMATION_LENGTH)
      .optional()
      .describe(
        'Saved workflow id to register as an automation on the AI index. Use when the workflow was already saved manually.'
      ),
    aiIndexId: z
      .string()
      .max(MAX_AI_INDEX_ID_LENGTH)
      .optional()
      .describe(
        'Context Engine AI index id. Defaults to the id from the ai_index attachment in this conversation.'
      ),
  })
  .superRefine((value, ctx) => {
    const hasWorkflowAttachmentId = value.workflowAttachmentId !== undefined;
    const hasWorkflowId = value.workflowId !== undefined;

    if (hasWorkflowAttachmentId === hasWorkflowId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of workflowAttachmentId or workflowId.',
        path: ['workflowAttachmentId'],
      });
    }

    if (value.aiIndexId === undefined) {
      return;
    }

    const validationError = validateAiIndexId(value.aiIndexId);
    if (validationError) {
      ctx.addIssue({
        code: 'custom',
        message: validationError,
        path: ['aiIndexId'],
      });
    }
  });

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const createSaveAutomationTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): BuiltinToolDefinition<typeof saveAutomationSchema> => ({
  id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'workflows'],
  // Create/upsert write: persists a workflow and attaches it to the AI index.
  annotations: {
    title: 'Save workflow automation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Save a generated workflow and/or attach it to a Context Engine AI index as an automation.
    - To persist a draft from generate_workflow, pass workflowAttachmentId.
    - If the user already saved the workflow manually, pass workflowId instead.
    Requires an ai_index attachment in the conversation unless aiIndexId is provided explicitly.
  `,
  schema: saveAutomationSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const { attachments, request, spaceId } = context;
      const aiIndexLabel = tryResolveAiIndexDisplayLabelFromAttachments(
        attachments,
        typeof toolParams.aiIndexId === 'string' ? toolParams.aiIndexId : undefined
      );
      const workflowAttachmentId =
        typeof toolParams.workflowAttachmentId === 'string'
          ? toolParams.workflowAttachmentId
          : undefined;
      const workflowId =
        typeof toolParams.workflowId === 'string' ? toolParams.workflowId : undefined;

      let workflowLabel = 'workflow';
      if (workflowAttachmentId) {
        const workflowName = tryResolveWorkflowDisplayNameFromAttachments(
          attachments,
          workflowAttachmentId
        );
        workflowLabel = workflowName
          ? `workflow "${workflowName}"`
          : `draft workflow attachment "${workflowAttachmentId}"`;
      } else if (workflowId) {
        let workflowName: string | undefined;
        const security = await getSecurityStart();
        const canRead = await hasWorkflowReadPrivilege({
          security,
          request,
          spaceId,
        });
        if (canRead) {
          workflowName = await tryResolveWorkflowDisplayNameById({
            workflowsManagement: getWorkflowsManagement(),
            workflowId,
            spaceId,
          });
        }
        workflowLabel = workflowName ? `workflow "${workflowName}"` : `workflow "${workflowId}"`;
      }

      return {
        title: 'Save workflow automation',
        message: `Save ${workflowLabel} to Kibana and attach it to AI index "${aiIndexLabel}"?`,
        confirm_text: 'Save and attach',
        cancel_text: 'Cancel',
      };
    },
  },
  handler: async (params, { request, spaceId, attachments, logger }) => {
    try {
      const result = await saveAutomationHandler({
        params,
        request,
        spaceId,
        attachments,
        logger,
        getAiIndexService,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: result,
          },
        ],
      };
    } catch (error) {
      const message = getSaveAutomationErrorMessage(error);
      logger.error(`Error running ${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}: ${message}`, {
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to save workflow automation: ${message}`,
            },
          },
        ],
      };
    }
  },
});
