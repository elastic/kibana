/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmailParamsSchema,
  SlackParamsSchema,
  JiraParamsSchema,
  PagerdutyParamsSchema,
  SlackApiParamsSchema,
  WebhookParamsSchema,
} from '@kbn/stack-connectors-plugin/server';
import { CompatibleJSONSchema } from '../../common/functions/types';
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
      visibility: FunctionVisibility.All,
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

export const connectorParamsSchemas: Record<string, CompatibleJSONSchema> = {
  '.slack': convertSchemaToOpenApi(SlackParamsSchema),
  '.slack_api': convertSchemaToOpenApi(SlackApiParamsSchema),
  '.email': convertSchemaToOpenApi(EmailParamsSchema),
  '.webhook': convertSchemaToOpenApi(WebhookParamsSchema),
  '.jira': convertSchemaToOpenApi(JiraParamsSchema),
  '.pagerduty': convertSchemaToOpenApi(PagerdutyParamsSchema),
};

export const GET_CONNECTOR_INFO_FUNCTION_NAME = 'get_connector_info';

export function registerGetConnectorInfoFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: GET_CONNECTOR_INFO_FUNCTION_NAME,
      description:
        'Get information about a connectors. Returns the schema of the connector parameters.',
      visibility: FunctionVisibility.AssistantOnly,
    },
    async () => {
      const actionsClient = await (
        await resources.plugins.actions.start()
      ).getActionsClientWithRequest(resources.request);
      const connectorsList = await actionsClient.getAll().then((connectors) => {
        return connectors.map((connector) => {
          if (connector.actionTypeId in connectorParamsSchemas) {
            return {
              ...connector,
              parameters: connectorParamsSchemas[connector.actionTypeId],
            };
          }

          return connector;
        });
      });
      return { content: connectorsList };
    }
  );
}
