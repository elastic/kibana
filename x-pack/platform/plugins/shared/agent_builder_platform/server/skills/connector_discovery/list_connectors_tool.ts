/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getToolResultId,
  createErrorResult,
  listAgentConnectors,
  resolveAllowedConnectorIds,
} from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

const listConnectorsSchema = lazySchema(() =>
  z.object({
    include_unassigned: z
      .boolean()
      .optional()
      .describe(
        'When true, also return connectors that exist in the space but are not assigned to this agent, each marked with `assigned`. Defaults to false. Set it only when the user asks about a connector that is not in the default list.'
      ),
  })
);

export type ListConnectorsInput = z.infer<typeof listConnectorsSchema>;

/** Inline tool that lists connectors with a ConnectorSpec that are callable as agent tools. */
export const createListConnectorsTool = ({
  getActionsStart,
}: {
  getActionsStart: () => Promise<ActionsPluginStart>;
}): BuiltinSkillBoundedTool<typeof listConnectorsSchema> => ({
  id: 'list_connectors',
  type: ToolType.builtin,
  description: `List the connectors this agent is allowed to call as tools. Returns each connector's id, name, type, and a short description.

**When to use:** To find out what this agent can do with external services, or to get the connector id to pass to get_connector_sub_actions and execute_connector_sub_action.
**When NOT to use:**
- To find connectors for a workflow step (use platform.workflows.get_connectors — it lists every connector in the space, not just the ones this agent can call).
- To set up a new connector (use the connector-authoring skill).
- Again on a follow-up turn, when you still have a previous result. The list only changes when a connector is added to or removed from this agent.

A connector that exists in the space but is not in this list is not assigned to this agent and cannot be called. If the user asks about a connector that is not in the list, call this again with \`include_unassigned: true\` to check whether it exists. Connectors marked \`assigned: false\` cannot be called until the user adds them to this agent's connectors.`,
  schema: listConnectorsSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ include_unassigned: includeUnassigned }, context) => {
    try {
      const actionsStart = await getActionsStart();
      const actionsClient = await actionsStart.getActionsClientWithRequest(context.request);

      const allowedIds = resolveAllowedConnectorIds(context.agentConfiguration);

      if (includeUnassigned) {
        const all = await listAgentConnectors(actionsClient, { allowedIds: undefined });
        const connectors = all.map((connector) => ({
          ...connector,
          assigned: allowedIds === undefined || allowedIds.includes(connector.id),
        }));
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                connectors,
                total: connectors.length,
                assigned_total: connectors.filter((connector) => connector.assigned).length,
              },
            },
          ],
        };
      }

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
});
