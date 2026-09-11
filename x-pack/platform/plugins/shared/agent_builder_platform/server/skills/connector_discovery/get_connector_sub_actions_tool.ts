/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult, formatSchemaForLlm } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';

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
  description:
    'Get the full spec for a connector: its available sub-actions, their descriptions, and parameter schemas. Call this with a connector_id from list_connectors before invoking execute_connector_sub_action.',
  schema: getConnectorSubActionsSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    try {
      const actionsStart = await getActionsStart();
      const actionsClient = await actionsStart.getActionsClientWithRequest(context.request);

      const connector = await actionsClient.get({ id: input.connector_id });
      const spec = getConnectorSpec(connector.actionTypeId);

      if (!spec) {
        return {
          results: [
            createErrorResult({
              message:
                `Connector type '${connector.actionTypeId}' does not have a spec and cannot be called as an agent tool. ` +
                'Use list_connectors to find connectors with callable sub-actions.',
            }),
          ],
        };
      }

      const subActions = Object.entries(spec.actions)
        .filter(([name]) => isToolAction(spec, name))
        .map(([name, action]) => ({
          name,
          description: action.description ?? name,
          params: action.input ? formatSchemaForLlm(action.input) : 'No parameters',
        }));

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              id: connector.id,
              name: connector.name,
              type: connector.actionTypeId,
              description: spec.metadata.description ?? connector.name,
              subActions,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to get connector sub-actions: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as { name?: string; subActions?: unknown[] };
    return [
      {
        ...result,
        data: {
          summary: `Loaded ${data.subActions?.length ?? 0} sub-actions for connector '${
            data.name
          }'.`,
          name: data.name,
          subActionCount: data.subActions?.length ?? 0,
        },
      },
    ];
  },
});
