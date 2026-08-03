/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type {
  AttachmentBoundedTool,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import {
  AI_INDEX_ATTACHMENT_TYPE,
  contextEngineToolIds,
} from '../../../common/agent_builder/constants';
import type { AiIndexAttachmentData } from '../../../common/agent_builder/ai_index_attachment';
import { isAiIndexAttachmentData } from '../../../common/agent_builder/ai_index_attachment';
import { AiIndexNotFoundError } from '../../ai_indices/errors';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowsManagementApiLike } from '../../types';

/** Slugify a value into the `[a-z0-9_]` charset so it is safe inside a tool id. */
const idSafe = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/**
 * Attachment carrying an AI index into a conversation. Created by reference
 * (origin = AI index id); the snapshot is resolved from the registry at add time.
 * Exposes the CE tools plus an instance-scoped `get_ai_index_automations` tool that
 * resolves the linked workflow definitions (YAML) so the agent can review/edit them.
 */
export const createAiIndexAttachmentType = ({
  getAiIndexService,
  getWorkflowsApi,
}: {
  getAiIndexService: () => AiIndexService;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
}): AttachmentTypeDefinition<typeof AI_INDEX_ATTACHMENT_TYPE, AiIndexAttachmentData> => ({
  id: AI_INDEX_ATTACHMENT_TYPE,
  validate: (input) =>
    isAiIndexAttachmentData(input)
      ? { valid: true, data: input }
      : { valid: false, error: 'Invalid AI index attachment payload.' },
  resolve: async (origin) => {
    try {
      return await getAiIndexService().get(origin);
    } catch (error) {
      if (error instanceof AiIndexNotFoundError) {
        return undefined;
      }
      throw error;
    }
  },
  // getRepresentation omitted → the framework stringifies the resolved AI index
  // (dest, sources, automations, self-improvement). getBoundedTools adds a tool to
  // fetch the actual workflow definitions behind the automations.
  format: (attachment) => {
    const automations = (attachment.data.automations ?? []).filter((a) => a.type === 'workflow');
    const getAutomations: AttachmentBoundedTool = {
      id: `${AI_INDEX_ATTACHMENT_TYPE}.get_automations.${idSafe(attachment.data.id)}`,
      type: ToolType.builtin,
      description:
        `Fetch the workflow definitions (YAML) of the automations linked to AI index ` +
        `"${attachment.data.id}". Use it to review or edit how its knowledge items are built.`,
      schema: z.object({}),
      handler: async (_args, { spaceId }) => {
        const workflowsApi = getWorkflowsApi();
        if (!workflowsApi) {
          return {
            results: [
              { type: ToolResultType.error, data: { message: 'The workflows plugin is unavailable.' } },
            ],
          };
        }
        const resolved = await Promise.all(
          automations.map(async (automation) => {
            try {
              const workflow = await workflowsApi.getWorkflow(automation.value, spaceId);
              return {
                workflow_id: automation.value,
                role: automation.role,
                managed: automation.managed,
                name: workflow?.name,
                yaml: workflow?.yaml,
              };
            } catch (error) {
              return { workflow_id: automation.value, error: error.message };
            }
          })
        );
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { ai_index_id: attachment.data.id, automations: resolved },
            },
          ],
        };
      },
    };
    return { getBoundedTools: () => [getAutomations] };
  },
  getTools: () => [
    contextEngineToolIds.getAiIndex,
    contextEngineToolIds.updateAiIndex,
    contextEngineToolIds.saveAutomation,
  ],
  getAgentDescription: () =>
    'A Context Engine AI index the user wants you to set up or improve. Use get_ai_index to read its current state, and get_ai_index_automations to read the workflows that build its knowledge items, before acting.',
});
