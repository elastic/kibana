/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult, listAgentConnectors } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

const listConnectorsSchema = z.object({}).describe('No parameters.');

export type ListConnectorsInput = z.infer<typeof listConnectorsSchema>;

/** Inline tool that lists connectors with a ConnectorSpec that are callable as agent tools. */
export const createListConnectorsTool = ({
  getActionsStart,
}: {
  getActionsStart: () => Promise<ActionsPluginStart>;
}): BuiltinSkillBoundedTool<typeof listConnectorsSchema> => ({
  id: 'list_connectors',
  type: ToolType.builtin,
  description:
    "List connectors available to this agent that can be called as tools. Returns each connector's id, name, type, and a short description. Call this before deciding which connector to use or before calling get_connector_sub_actions.",
  schema: listConnectorsSchema,
  confirmation: { askUser: 'never' },
  handler: async (_input, context) => {
    try {
      const actionsStart = await getActionsStart();
      const actionsClient = await actionsStart.getActionsClientWithRequest(context.request);

      const allowedIds = context.agentConfiguration?.connector_ids;
      const connectors = await listAgentConnectors(actionsClient, { allowedIds });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: { connectors, total: connectors.length },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to list connectors: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as { total?: number };
    return [
      {
        ...result,
        data: { summary: `Listed ${data.total ?? 0} available connectors.`, total: data.total },
      },
    ];
  },
});
