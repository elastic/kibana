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
  'connectorId is required at the root of the tool arguments (copy the Connector ID from the connector attachment). ' +
  'Do not send only sub-action fields at the top level without connectorId and subAction.';

const subActionValidationMessage =
  'subAction is required at the root (exact sub-action name from the connector attachment, e.g. searchMessages). ' +
  'This tool does not infer subAction from other parameters.';

export const executeConnectorSubActionArgsSchema = z
  .object({
    connectorId: z
      .string()
      .min(1, connectorIdValidationMessage)
      .describe(
        'Saved connector instance ID at the **root** of arguments — not inside params. ' +
          'Must match the Connector ID shown in the connector attachment.'
      ),
    subAction: z
      .string()
      .min(1, subActionValidationMessage)
      .describe(
        'Exact sub-action name at the **root** of arguments (must match a tool sub-action listed on the attachment). ' +
          'Do not guess; read the attachment. Not inferred from params.'
      ),
    params: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'Sub-action parameters only — put every argument for the sub-action here. ' +
          'Do not place sub-action fields at the top level next to connectorId (they belong under params).'
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
    'Execute a sub-action on a connector instance. ' +
    'Required argument shape: { "connectorId": "<id>", "subAction": "<name>", "params": { ... } } — ' +
    'connectorId and subAction must always appear at the top level; pass sub-action fields inside params, not flattened to the root. ' +
    'Read the connector attachment for the Connector ID, exact sub-action names, and each sub-action parameter schema. ' +
    'Do not guess sub-action names or parameters.',
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
