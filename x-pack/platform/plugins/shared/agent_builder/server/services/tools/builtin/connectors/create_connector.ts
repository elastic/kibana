/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult, createErrorResult } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { ConnectorToolsOptions } from './types';

const createConnectorSchema = z.object({
  connector_type_id: z
    .string()
    .min(1)
    .describe(
      'The connector spec type ID (e.g. ".slack2", ".jira-cloud"). ' +
        'Use list_connector_specs or get_connector_schema to find the correct ID.'
    ),
  name: z.string().min(1).describe('A human-readable display name for this connector instance.'),
  config: z
    .record(z.string(), z.any())
    .optional()
    .default({})
    .describe(
      'Non-secret configuration fields as defined by the connector schema. ' +
        'Use get_connector_schema to discover required fields and their types.'
    ),
  secrets: z
    .record(z.string(), z.any())
    .optional()
    .default({})
    .describe(
      'Sensitive configuration fields (API keys, tokens, passwords). ' +
        'These are encrypted at rest by the server. ' +
        'Use get_connector_schema to discover required secret fields (marked sensitive: true).'
    ),
});

export const createCreateConnectorTool = ({
  getActions,
}: ConnectorToolsOptions): BuiltinToolDefinition<typeof createConnectorSchema> => ({
  id: platformCoreTools.createConnector,
  type: ToolType.builtin,
  description:
    'Create a new connector instance. Requires the connector type ID, a display name, ' +
    'and the config/secrets fields defined by the connector schema. ' +
    'IMPORTANT: Call get_connector_schema first to discover required fields. ' +
    'The server validates all fields and handles secret encryption.',
  schema: createConnectorSchema,
  tags: ['connector'],
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
  handler: async ({ connector_type_id: connectorTypeId, name, config, secrets }, context) => {
    const actions = await getActions();
    const actionsClient = await actions.getActionsClientWithRequest(context.request);

    try {
      const result = await actionsClient.create({
        action: {
          actionTypeId: connectorTypeId,
          name,
          config: config ?? {},
          secrets: secrets ?? {},
        },
      });

      return {
        results: [
          createOtherResult({
            connector_id: result.id,
            name: result.name,
            connector_type_id: result.actionTypeId,
            message: `Connector '${result.name}' created successfully.`,
          }),
        ],
      };
    } catch (error) {
      return {
        results: [createErrorResult(`Failed to create connector: ${(error as Error).message}`)],
      };
    }
  },
});
