/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import type { ConnectorToolsOptions } from './types';

const executeConnectorSubActionSchema = z.object({
  connectorId: z.string().min(1).describe('The ID of the connector instance to execute against'),
  subAction: z
    .string()
    .min(1)
    .describe(
      'The exact name of the sub-action to execute. ' +
        'Must match one of the sub-action names listed in the connector attachment (e.g. searchMessages, sendMessage). ' +
        'Do not guess — read the connector attachment first.'
    ),
  params: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'Parameters for the sub-action. Must include all required parameters as described in the connector attachment. ' +
        'Read the connector attachment to see which parameters are required vs optional.'
    ),
});

/**
 * Creates the execute_connector_sub_action tool.
 *
 * This tool allows agents to execute any connector sub-action directly,
 * replacing the need for per-connector workflow tools.
 */
export const createExecuteConnectorSubActionTool = ({
  getActions,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof executeConnectorSubActionSchema> => ({
  id: platformCoreTools.executeConnectorSubAction,
  type: ToolType.builtin,
  description:
    'Execute a sub-action on a connector instance. ' +
    'IMPORTANT: Before calling this tool, you MUST read the connector attachment to find the exact sub-action names, ' +
    'required parameters, and the connectorId. Do not guess sub-action names or parameters. ' +
    'The connector attachment lists all available sub-actions with their parameter schemas.',
  schema: executeConnectorSubActionSchema,
  tags: ['connector', 'sub-action'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'Connector tools require the connectors feature to be enabled',
          };
    },
  },
  handler: async ({ connectorId, subAction, params }, context) => {
    const actions = await getActions();
    const actionsClient = await actions.getActionsClientWithRequest(context.request);

    // Resolve the connector type from the connector ID
    let connectorType: string;
    try {
      const connector = await actionsClient.get({ id: connectorId });
      connectorType = connector.actionTypeId;
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to resolve connector '${connectorId}': ${(error as Error).message}`,
            metadata: { connectorId, subAction },
          }),
        ],
      };
    }

    // Validate that we have a known connector spec
    const spec = getConnectorSpec(connectorType);
    if (!spec) {
      return {
        results: [
          createErrorResult({
            message:
              `No connector spec found for type '${connectorType}' (connector '${connectorId}'). ` +
              'This connector type does not support sub-action execution via this tool.',
            metadata: { connectorId, connectorType, subAction },
          }),
        ],
      };
    }

    // Validate that the sub-action is marked as a tool in the connector spec
    if (!isToolAction(spec, subAction)) {
      return {
        results: [
          createErrorResult({
            message:
              `Sub-action '${subAction}' is not available as a tool on connector type '${connectorType}'. ` +
              'Read the connector attachment to find the correct sub-action names.',
            metadata: { connectorId, connectorType, subAction },
          }),
        ],
      };
    }

    let executeResult;
    try {
      executeResult = await actionsClient.execute({
        actionId: connectorId,
        params: {
          subAction,
          subActionParams: params ?? {},
        },
      });
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message:
              `Failed to execute sub-action '${subAction}' on connector '${connectorId}': ${
                (error as Error).message
              }` +
              ' — Read the connector attachment to find valid sub-action names and their required parameters.',
            metadata: { connectorId, subAction },
          }),
        ],
      };
    }

    if (executeResult.status === 'error') {
      return {
        results: [
          createErrorResult({
            message:
              `Connector sub-action '${subAction}' returned an error: ${
                executeResult.message ?? 'Unknown error'
              }` +
              ' — Check the connector attachment for the correct sub-action names and required parameters.',
            metadata: {
              connectorId,
              subAction,
              serviceMessage: executeResult.serviceMessage,
            },
          }),
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: executeResult.data ?? { message: 'Sub-action executed successfully' },
        },
      ],
    };
  },
});
