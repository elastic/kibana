/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

const getConnectorsSchema = z.object({
  actionTypeId: z
    .string()
    .optional()
    .describe(
      'Filter by exact connector action type ID. Only use this if you already know the precise ' +
        'actionTypeId value from a previous get_connectors call. Do NOT guess or infer this value ' +
        '— call without this parameter first to discover available action types.'
    ),
  stepType: z
    .string()
    .optional()
    .describe(
      'Filter by exact workflow step type. Only use this if you already know the precise stepType ' +
        'value from a previous get_connectors call. Do NOT guess or infer this value — call ' +
        'without this parameter first to discover available step types.'
    ),
  search: z.string().optional().describe('Search term to match against connector names'),
});

export const getConnectorsTool = (
  api: WorkflowsManagementApi
): BuiltinToolDefinition<typeof getConnectorsSchema> => ({
  id: 'platform.workflows.get_connectors',
  type: ToolType.builtin,
  description:
    "Get connector instances configured in the user's environment. " +
    'Returns connector IDs needed for the connector-id field in workflow steps. ' +
    'Call with no filters first to discover all available connectors and their action types, ' +
    'then use filters in subsequent calls only with exact values from the initial response.',
  tags: ['workflows', 'connectors'],
  schema: getConnectorsSchema,
  handler: async ({ actionTypeId, stepType, search }, { spaceId, request }) => {
    const { connectorsByType, totalConnectors } = await api.getAvailableConnectors(
      spaceId,
      request
    );

    const entries = actionTypeId
      ? connectorsByType[actionTypeId]
        ? [[actionTypeId, connectorsByType[actionTypeId]] as const]
        : []
      : Object.entries(connectorsByType);

    let connectors = entries.flatMap(([type, typeInfo]) => {
      const baseStepType = type.replace(/^\./, '');
      const stepTypes =
        (typeInfo as any).subActions?.length > 0
          ? (typeInfo as any).subActions.map((sa: { name: string }) => `${baseStepType}.${sa.name}`)
          : [baseStepType];

      return ((typeInfo as any).instances ?? []).map((instance: { id: string; name: string }) => ({
        id: instance.id,
        name: instance.name,
        actionTypeId: type,
        stepTypes,
      }));
    });

    if (stepType) {
      connectors = connectors.filter((c) => c.stepTypes.includes(stepType));
    }

    if (search) {
      const term = search.toLowerCase();
      connectors = connectors.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.actionTypeId.toLowerCase().includes(term) ||
          c.stepTypes.some((st: string) => st.toLowerCase().includes(term))
      );
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            count: connectors.length,
            totalAvailable: totalConnectors,
            connectors,
          },
        },
      ],
    };
  },
});
