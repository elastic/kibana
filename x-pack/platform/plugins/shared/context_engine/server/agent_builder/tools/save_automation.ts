/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { contextEngineToolIds } from '../../../common/agent_builder/constants';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../../common/constants';
import type { AiIndexAutomation } from '../../../common/http_api/ai_indices';
import { AiIndexConflictError, AiIndexNotFoundError } from '../../ai_indices/errors';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowsManagementApiLike } from '../../types';

const saveAutomationSchema = z.object({
  ai_index_id: z.string().describe('The id of the AI index this automation belongs to.'),
  yaml: z.string().describe('The complete workflow definition, as YAML.'),
  workflow_id: z
    .string()
    .optional()
    .describe(
      'The id of an existing workflow to overwrite. Omit to create a new one. Pass this when fixing an automation that already exists.'
    ),
});

/**
 * Links a KI-creation workflow to an AI index in one step: `generate_workflow`
 * only produces a candidate, so without this the agent would leave behind an
 * unreferenced workflow or a dangling reference. Automations saved this way are
 * marked managed, so the agent may rewrite them later.
 */
export const saveAutomationTool = ({
  getAiIndexService,
  getWorkflowsApi,
}: {
  getAiIndexService: () => AiIndexService;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
}): BuiltinToolDefinition<typeof saveAutomationSchema> => ({
  id: contextEngineToolIds.saveAutomation,
  type: ToolType.builtin,
  description:
    'Persist a KI-creation workflow and register it as a managed automation of a Context Engine AI index. ' +
    'Creates the workflow when no workflow_id is given, otherwise overwrites that workflow.',
  tags: ['context-engine'],
  schema: saveAutomationSchema,
  handler: async ({ ai_index_id: aiIndexId, yaml, workflow_id: workflowId }, { request, spaceId }) => {
    const workflowsApi = getWorkflowsApi();
    if (!workflowsApi) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'The workflows plugin is unavailable, so automations cannot be saved.' },
          },
        ],
      };
    }

    const aiIndexService = getAiIndexService();
    let aiIndex;
    try {
      aiIndex = await aiIndexService.get(aiIndexId);
    } catch (error) {
      if (error instanceof AiIndexNotFoundError) {
        return {
          results: [
            { type: ToolResultType.error, data: { message: `AI index '${aiIndexId}' does not exist.` } },
          ],
        };
      }
      throw error;
    }

    const isExisting = aiIndex.automations.some((automation) => automation.value === workflowId);
    if (workflowId && !isExisting) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Workflow '${workflowId}' is not an automation of AI index '${aiIndexId}'. Omit workflow_id to create a new automation.`,
            },
          },
        ],
      };
    }

    let savedWorkflowId: string;
    if (workflowId) {
      await workflowsApi.updateWorkflow(workflowId, { yaml }, spaceId, request);
      savedWorkflowId = workflowId;
    } else {
      const created = await workflowsApi.createWorkflow({ yaml }, spaceId, request);
      savedWorkflowId = created.id;
    }

    const automation: AiIndexAutomation = {
      type: 'workflow',
      value: savedWorkflowId,
      role: 'ki_creation',
      managed: true,
    };
    const automations = isExisting
      ? aiIndex.automations.map((existing) =>
          existing.value === savedWorkflowId ? automation : existing
        )
      : [...aiIndex.automations, automation];

    if (automations.length > MAX_AI_INDEX_AUTOMATIONS) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `AI index '${aiIndexId}' already has the maximum of ${MAX_AI_INDEX_AUTOMATIONS} automations.`,
            },
          },
        ],
      };
    }

    try {
      await aiIndexService.patch(aiIndexId, { automations });
    } catch (error) {
      if (error instanceof AiIndexConflictError) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Workflow '${savedWorkflowId}' was saved, but linking it failed due to a concurrent modification. Re-read with get_ai_index and retry with workflow_id='${savedWorkflowId}'.`,
              },
            },
          ],
        };
      }
      throw error;
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { workflow_id: savedWorkflowId, status: workflowId ? 'updated' : 'created' },
        },
      ],
    };
  },
});
