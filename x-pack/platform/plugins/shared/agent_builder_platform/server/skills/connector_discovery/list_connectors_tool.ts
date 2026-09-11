/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorSpec } from '@kbn/connector-specs';

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
      const allConnectors = await actionsClient.getAll();

      const connectors = allConnectors
        .filter((connector) => !!getConnectorSpec(connector.actionTypeId))
        .map((connector) => {
          const spec = getConnectorSpec(connector.actionTypeId);
          return {
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
            description: spec?.metadata.description ?? connector.name,
          };
        });

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
