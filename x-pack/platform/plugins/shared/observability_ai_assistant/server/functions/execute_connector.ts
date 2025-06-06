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
import { BEDROCK_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import { GEMINI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/gemini/constants';
import { INFERENCE_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/inference/constants';
import { OPENAI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/openai/constants';
import {
  EmailConnectorTypeId,
  JiraConnectorTypeId,
  PagerDutyConnectorTypeId,
  SlackApiConnectorTypeId,
  SlackWebhookConnectorTypeId,
  WebhookConnectorTypeId,
} from '@kbn/stack-connectors-plugin/server/connector_types';
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

export const connectorParamsSchemas: Record<
  string,
  { params: CompatibleJSONSchema; description: string }
> = {
  [SlackWebhookConnectorTypeId]: {
    params: convertSchemaToOpenApi(SlackParamsSchema),
    description: 'Use this connector to send messages to Slack channels.',
  },
  [SlackApiConnectorTypeId]: {
    params: convertSchemaToOpenApi(SlackApiParamsSchema),
    description: 'Use this connector to send messages to Slack channels using the Slack API.',
  },
  [EmailConnectorTypeId]: {
    params: convertSchemaToOpenApi(EmailParamsSchema),
    description: 'Use this connector to send emails.',
  },
  [WebhookConnectorTypeId]: {
    params: convertSchemaToOpenApi(WebhookParamsSchema),
    description: 'Use this connector to send HTTP requests to a specified URL.',
  },
  [JiraConnectorTypeId]: {
    params: convertSchemaToOpenApi(JiraParamsSchema),
    description: 'Use this connector to create Jira issues.',
  },
  [PagerDutyConnectorTypeId]: {
    params: convertSchemaToOpenApi(PagerdutyParamsSchema),
    description: 'Use this connector to trigger PagerDuty incidents.',
  },
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
        'Retrieves information about available connectors, including the parameter schema for each.',
      visibility: FunctionVisibility.AssistantOnly,
    },
    async () => {
      const actionsClient = await (
        await resources.plugins.actions.start()
      ).getActionsClientWithRequest(resources.request);

      const allConnectors = await actionsClient.getAll();

      // IDs of connectors to exclude (used for inference/AI purposes)
      const excludedConnectorIds = new Set([
        BEDROCK_CONNECTOR_ID,
        GEMINI_CONNECTOR_ID,
        INFERENCE_CONNECTOR_ID,
        OPENAI_CONNECTOR_ID,
      ]);

      const filteredConnectors = allConnectors
        // filter out AI connectors
        .filter((connector) => !excludedConnectorIds.has(connector.actionTypeId))
        .map((connector) => ({
          id: connector.id,
          actionTypeId: connector.actionTypeId,
          name: connector.name,
          // Include the connector parameters schema and description
          ...(connectorParamsSchemas[connector.actionTypeId] ?? {}),
        }));
      return { content: filteredConnectors };
    }
  );
}
