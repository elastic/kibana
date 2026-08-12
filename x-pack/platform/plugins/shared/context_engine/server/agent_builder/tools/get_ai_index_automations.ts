/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { Capabilities } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments/tools';
import { GET_AI_INDEX_AUTOMATIONS_TOOL_ID } from '../../../common/agent_builder/constants';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import type { WorkflowsManagementApiLike } from '../../types';

// Duplicated locally to avoid a value import of `@kbn/workflows` / the workflows plugin (which would
// re-introduce a dependency cycle — see the bridge docs). Mirrors `WORKFLOWS_MANAGEMENT_FEATURE_ID`
// and `WorkflowsManagementUiActions.read` from `@kbn/workflows`.
const WORKFLOWS_FEATURE_ID = 'workflowsManagement';
const WORKFLOWS_READ_CAPABILITY = 'readWorkflow';

/**
 * Read-only bounded tool for the `ai_index` attachment: returns the YAML of every workflow the AI
 * index links as an automation. The workflows API reads as the internal user, so the handler first
 * enforces the caller's own Workflows Management **read** privilege — without it, a user could
 * attach an AI index referencing workflows they cannot otherwise read and exfiltrate their YAML.
 * No writes, no other data access.
 */
export const getAiIndexAutomationsTool = ({
  aiIndex,
  getWorkflowsApi,
  getCapabilities,
}: {
  aiIndex: AiIndexHttpItem;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
  getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}): BuiltinAttachmentBoundedTool => ({
  // AI index ids are already constrained to `^[a-z0-9][a-z0-9_-]*$`, so they are safe to embed in
  // the bounded tool id directly.
  id: `${GET_AI_INDEX_AUTOMATIONS_TOOL_ID}.${aiIndex.id}`,
  type: ToolType.builtin,
  description: `Fetch the YAML of every workflow linked to AI index "${aiIndex.id}" as an automation.`,
  schema: z.object({}),
  handler: async (_args, { request, spaceId }) => {
    const capabilities = await getCapabilities(request);
    if (!capabilities[WORKFLOWS_FEATURE_ID]?.[WORKFLOWS_READ_CAPABILITY]) {
      throw new Error(
        'Unauthorized: reading an AI index’s linked workflows requires the Workflows Management read privilege.'
      );
    }

    const workflowsApi = getWorkflowsApi();
    const automations = await Promise.all(
      aiIndex.automations
        .filter((automation) => automation.type === 'workflow')
        .map(async (automation) => {
          if (!workflowsApi) {
            return {
              workflow_id: automation.value,
              error: 'Workflows Management is not available.',
            };
          }
          try {
            const workflow = await workflowsApi.getWorkflow(automation.value, spaceId);
            if (!workflow) {
              return { workflow_id: automation.value, error: 'Workflow not found.' };
            }
            return { workflow_id: automation.value, yaml: workflow.yaml };
          } catch (error) {
            return {
              workflow_id: automation.value,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
    );

    return {
      results: [{ type: ToolResultType.other, data: { ai_index_id: aiIndex.id, automations } }],
    };
  },
});
