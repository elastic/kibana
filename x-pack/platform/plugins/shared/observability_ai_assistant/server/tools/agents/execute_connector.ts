/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, toArray, filter } from 'rxjs';
import { FunctionVisibility } from '../../../common';
import { FunctionRegistrationParameters } from '../functions';
import { MessageRole } from '../../../common';
import { continueConversation } from '../../service/client/operators/continue_conversation';
import {
  EXECUTE_CONNECTOR_FUNCTION_NAME,
  GET_CONNECTOR_INFO_FUNCTION_NAME,
  VALIDATE_CONNECTOR_PARAMS_FUNCTION_NAME,
  registerExecuteConnectorFunction,
  registerGetConnectorInfoFunction,
  registerValidateConnectorParamsFunction,
} from '../functions/execute_connector';
import { ChatFunctionClient } from '../../service/chat_function_client';

export const EXECUTE_CONNECTOR_AGENT_NAME = 'execute_connector_agent';
export const EXECUTE_CONNECTOR_AGENT_SYSTEM_MESSAGE = `You are an assistant for Elastic Observability, responsible for executing Kibana connectors based on user prompts.
**Important:** Before calling the "${EXECUTE_CONNECTOR_FUNCTION_NAME}" function, you MUST first call the "${GET_CONNECTOR_INFO_FUNCTION_NAME}" function.
This is required to:
1. Retrieve the list of available connectors.
2. Obtain the correct schema and required parameters for the connector you want to execute.
Once you receive the connector information:
- Select the correct connector by its "id".
- Construct the "params" object using the schema provided for that connector.
- Validate the "params" using the "${VALIDATE_CONNECTOR_PARAMS_FUNCTION_NAME}" function to ensure they meet the connector's requirements. **important:** This step is crucial to avoid errors during execution. you must include id and params in the validation function call.
- if the validation fails, try to correct the parameters based on the error message returned by the validation function. if you cannot correct the parameters, inform the user about the issue and ask for clarification or additional information.
- if the validation is successful, proceed with the execution.
- Then, and only then, call the "${EXECUTE_CONNECTOR_FUNCTION_NAME}" function with the appropriate "id" and "params".

Skipping this process may result in errors, invalid schema usage, or failed executions.`;

export function registerExecuteConnectorAgent({
  functions,
  resources,
  client,
  scopes = [],
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: EXECUTE_CONNECTOR_AGENT_NAME,
      description:
        'Use this LLM agent when the user explicitly asks to call a Kibana connector. It allows executing connectors (e.g. Slack, Jira, Email) using a natural language prompt.',
      visibility: FunctionVisibility.AssistantOnly,
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'The prompt describing the connector action to perform. For example, "Send a message to Slack channel #general with the content: Hello, world!", or "Create a Jira issue with the title: Bug in the system". or "Email this context to <user_email>". This prompt should be clear and concise, specifying the action to be performed and any necessary details.',
          },
        },
        required: ['prompt'],
      } as const,
    },
    async ({ arguments: args, chat, connectorId }, signal) => {
      const fnClient = new ChatFunctionClient([]);

      // Register required connector functions
      registerGetConnectorInfoFunction({
        functions: fnClient,
        resources,
        signal,
        client,
        scopes,
      });
      registerValidateConnectorParamsFunction({
        functions: fnClient,
        resources,
        signal,
        client,
        scopes,
      });
      registerExecuteConnectorFunction({
        functions: fnClient,
        resources,
        signal,
        client,
        scopes,
      });

      // Start a new conversation with the user prompt
      const conversation$ = continueConversation({
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: args.prompt,
            },
          },
        ],
        functionClient: fnClient,
        chat: (_name, params) =>
          chat(_name, {
            ...params,
            signal,
            systemMessage: EXECUTE_CONNECTOR_AGENT_SYSTEM_MESSAGE,
            functions: fnClient.getFunctions().map((fn) => fn.definition),
            stream: false,
          }),
        signal,
        functionCallsLeft: 3,
        apiUserInstructions: [],
        kbUserInstructions: [],
        logger: resources.logger,
        disableFunctions: false,
        connectorId,
        simulateFunctionCalling: false,
      });

      const events = await lastValueFrom(
        conversation$.pipe(
          filter((event) => event.type !== 'chatCompletionChunk'),
          toArray()
        )
      );
      return {
        content: events,
      };
    }
  );
}
