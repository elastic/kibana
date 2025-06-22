/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertSchemaToOpenApi } from './convert_schema_to_open_api';
import { FunctionRegistrationParameters } from '.';
import { FunctionVisibility } from '../../common';

export const EXECUTE_CONNECTOR_FUNCTION_NAME = 'execute_connector';

export function registerExecuteConnectorFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: EXECUTE_CONNECTOR_FUNCTION_NAME,
      description: 'Use this function when user explicitly asks to call a kibana connector.',
      visibility: FunctionVisibility.AssistantOnly,
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The id of the connector',
          },
          params: {
            type: 'object',
            description: 'The connector parameters',
          },
        },
        required: ['id', 'params'],
      } as const,
    },
    async ({ arguments: { id, params } }, signal) => {
      const actionsClient = await (
        await resources.plugins.actions.start()
      ).getActionsClientWithRequest(resources.request);
      const content = await actionsClient.execute({ actionId: id, params });
      return { content };
    }
  );
}

export const GET_CONNECTOR_INFO_FUNCTION_NAME = 'get_connector_info';

export function registerGetConnectorInfoFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: GET_CONNECTOR_INFO_FUNCTION_NAME,
      description:
        'Retrieves information about available connectors, including the parameter schema for each.',
      visibility: FunctionVisibility.AssistantOnly,
    },
    async () => {
      const actionsClient = await (
        await resources.plugins.actions.start()
      ).getActionsClientWithRequest(resources.request);

      let allConnectors = await actionsClient.getAll();

      // IDs of connectors to exclude (used for inference/AI purposes)
      const excludedConnectorIds = new Set(['.bedrock', '.gemini', '.inference', '.gen-ai']);

      // filter out AI connectors
      allConnectors = allConnectors.filter(
        (connector) => !excludedConnectorIds.has(connector.actionTypeId)
      );

      // get all connector parameters schemas
      const connectorParamsSchemas = await Promise.all(
        allConnectors.map(async (connector) => {
          const actionType = await actionsClient.getActionType({
            actionTypeId: connector.actionTypeId,
          });
          if (!actionType) {
            return {
              params: { type: 'object', properties: {} },
              description: `Action type for connector with id ${connector.id} not found.`,
            };
          }
          const paramsSchema = actionType.validate?.params?.schema;
          if (!paramsSchema) {
            return {
              params: { type: 'object', properties: {} },
              description: `Action type for connector with id ${connector.id} does not have a parameters schema.`,
            };
          }
          return {
            actionTypeId: connector.actionTypeId,
            params: convertSchemaToOpenApi(paramsSchema),
            description: actionType.description,
          };
        })
      );

      const filteredConnectors = allConnectors
        // filter out AI connectors
        .filter((connector) => !excludedConnectorIds.has(connector.actionTypeId))
        .map((connector) => ({
          id: connector.id,
          actionTypeId: connector.actionTypeId,
          name: connector.name,
          // Include the connector parameters schema and description
          ...(connectorParamsSchemas.find(
            (schema) => schema.actionTypeId === connector.actionTypeId
          ) ?? {}),
        }));
      return { content: filteredConnectors };
    }
  );
}
