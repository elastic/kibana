/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { workflowTools } from '../../common/constants';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export function registerGetConnectorsTool(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: workflowTools.getConnectors,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Connectors',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `Get connector instances configured in the user's environment.

**When to use:** To find connector IDs needed for the \`connector-id\` field in workflow steps (e.g., which Slack or Jira connectors are available).
**When NOT to use:** To discover step types and their schemas (use get_step_definitions instead).

Returns:
- \`connectors\`: instances with their ID, name, and \`actionTypeId\` (Kibana action type ID, e.g. ".slack")
- \`stepTypesByActionType\`: a map from \`actionTypeId\` to the workflow step types it supports (e.g. \`{".inference": ["inference.completion", "inference.rerank"]}\`). Look up a connector's supported step types via its \`actionTypeId\`.

The connector \`id\` is what you put in the \`connector-id\` field of a workflow step.`,
    schema: z.object({
      actionTypeId: z
        .string()
        .optional()
        .describe('Filter by connector action type ID (e.g., ".slack", ".jira", ".webhook")'),
      stepType: z
        .string()
        .optional()
        .describe('Filter by workflow step type (e.g., "slack", "jira", "inference.completion")'),
      search: z.string().optional().describe('Search term to match against connector names'),
    }),
    tags: ['workflows', 'connectors'],
    handler: async ({ actionTypeId, stepType, search }, { spaceId, request }) => {
      const { connectorTypes, totalConnectors } = await api.getAvailableConnectors(
        spaceId,
        request
      );

      const entries = actionTypeId
        ? connectorTypes[actionTypeId]
          ? [[actionTypeId, connectorTypes[actionTypeId]] as const]
          : []
        : Object.entries(connectorTypes);

      const stepTypesByActionType: Record<string, string[]> = {};

      let connectors = entries.flatMap(([type, typeInfo]) => {
        const baseStepType = type.replace(/^\./, '');
        const stepTypesForType =
          typeInfo.subActions?.length > 0
            ? typeInfo.subActions.map((sa) => `${baseStepType}.${sa.name}`)
            : [baseStepType];

        stepTypesByActionType[type] = stepTypesForType;

        return (typeInfo.instances ?? []).map((instance) => ({
          id: instance.id,
          name: instance.name,
          actionTypeId: type,
        }));
      });

      if (stepType) {
        connectors = connectors.filter((c) =>
          stepTypesByActionType[c.actionTypeId]?.includes(stepType)
        );
      }

      if (search) {
        const term = search.toLowerCase();
        connectors = connectors.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.actionTypeId.toLowerCase().includes(term) ||
            stepTypesByActionType[c.actionTypeId]?.some((st) => st.toLowerCase().includes(term))
        );
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: connectors.length,
              totalAvailable: totalConnectors,
              stepTypesByActionType,
              connectors,
            },
          },
        ],
      };
    },
  });
}
