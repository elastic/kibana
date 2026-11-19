/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getToolResultId,
  createErrorResult,
  getAgentConnectorDetail,
  resolveAllowedConnectorIds,
} from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

const getConnectorSubActionsSchema = z.object({
  connector_id: z
    .string()
    .min(1)
    .max(512)
    .describe(
      'The id of the connector instance to describe. Use a value returned by list_connectors — never invent an id.'
    ),
});

export type GetConnectorSubActionsInput = z.infer<typeof getConnectorSubActionsSchema>;

const isNotFoundError = (error: unknown): boolean =>
  (error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode === 404;

const noSpecMessage = (connectorId: string): string =>
  `Connector '${connectorId}' does not have a spec and cannot be called as an agent tool. ` +
  'Use list_connectors to find connectors with callable sub-actions.';

const notAssignedMessage = (connectorId: string): string =>
  `Connector '${connectorId}' isn't assigned to this agent, so it cannot be called. ` +
  "Tell the user it can be added in the agent's connector settings.";

/**
 * Inline tool that returns the full tool-callable sub-action list for a
 * specific connector, including each action's description and parameter schema.
 */
export const createGetConnectorSubActionsTool = ({
  getActionsStart,
}: {
  getActionsStart: () => Promise<ActionsPluginStart>;
}): BuiltinSkillBoundedTool<typeof getConnectorSubActionsSchema> => ({
  id: 'get_connector_sub_actions',
  type: ToolType.builtin,
  description: `Get the full spec for a connector this agent can call: its available sub-actions, their descriptions, and parameter schemas.

**When to use:** Before the first execute_connector_sub_action call on a connector, with a connector_id from list_connectors.
**When NOT to use:** Again for the same connector when you still have its sub-actions.`,
  schema: getConnectorSubActionsSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    try {
      const actionsStart = await getActionsStart();
      const actionsClient = await actionsStart.getActionsClientWithRequest(context.request);

      const allowedIds = resolveAllowedConnectorIds(context.agentConfiguration);
      if (allowedIds !== undefined && !allowedIds.includes(input.connector_id)) {
        // The agent can learn of unassigned connectors from list_connectors (include_unassigned).
        // Read only the connector's type to say why it can't be called; never return its
        // sub-actions.
        const { actionTypeId } = await actionsClient.get({ id: input.connector_id });
        return {
          results: [
            createErrorResult({
              message: getConnectorSpec(actionTypeId)
                ? notAssignedMessage(input.connector_id)
                : noSpecMessage(input.connector_id),
            }),
          ],
        };
      }

      const detail = await getAgentConnectorDetail(actionsClient, input.connector_id, {
        allowedIds,
      });

      if (!detail) {
        return {
          results: [createErrorResult({ message: noSpecMessage(input.connector_id) })],
        };
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: detail,
          },
        ],
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          results: [
            createErrorResult({
              message:
                `No connector with id '${input.connector_id}'. ` +
                'Use list_connectors to find the connectors this agent can call; never invent an id.',
            }),
          ],
        };
      }
      return {
        results: [
          createErrorResult({
            message: `Failed to get connector sub-actions: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
});
