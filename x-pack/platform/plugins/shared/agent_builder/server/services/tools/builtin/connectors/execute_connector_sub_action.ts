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

const connectorIdValidationMessage =
  'connectorId must be at the root of the arguments (copy the value labeled Connector ID from the connector attachment). ' +
  'Do not send only sub-action fields at the root; include connectorId and subAction together.';

const subActionValidationMessage =
  'subAction must be at the root — use the exact name from the connector attachment (for example searchMessages). ' +
  'It is not inferred from params or other fields.';

export const executeConnectorSubActionArgsSchema = z
  .object({
    connectorId: z
      .string()
      .min(1, connectorIdValidationMessage)
      .describe(
        'Connector instance ID at the **root** of the arguments object (not inside params). ' +
          'Must match the Connector ID line on the connector attachment.'
      ),
    subAction: z
      .string()
      .min(1, subActionValidationMessage)
      .describe(
        'Exact sub-action name at the **root** (must match a name listed under Available sub-actions on the attachment). ' +
          'Do not guess or infer from params.'
      ),
    params: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'Parameters for the chosen sub-action only — include each field the sub-action expects. ' +
          'Do not put those fields next to connectorId at the root; they belong in params.'
      ),
  })
  .strict();

/**
 * Creates the execute_connector_sub_action tool.
 *
 * This tool allows agents to execute any connector sub-action directly,
 * replacing the need for per-connector workflow tools.
 */
export const createExecuteConnectorSubActionTool = ({
  getActions,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof executeConnectorSubActionArgsSchema> => ({
  id: platformCoreTools.executeConnectorSubAction,
  type: ToolType.builtin,
  description:
    'Runs one sub-action on a saved connector. ' +
    'Arguments must look like: {"connectorId":"<id>","subAction":"<name>","params":{...}}. ' +
    'Keep connectorId and subAction at the root; put every argument for the sub-action inside params, not at the root. ' +
    'Use the connector attachment for the Connector ID, allowed sub-action names, and parameter definitions. ' +
    'Do not invent names or parameters.',
  schema: executeConnectorSubActionArgsSchema,
  tags: ['connector', 'sub-action'],
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason: 'Connector tools require Agent Builder experimental features to be enabled',
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
