/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, filter, last } from 'rxjs';
import { FunctionVisibility, StreamingChatResponseEventType } from '../../../common';
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
export const EXECUTE_CONNECTOR_AGENT_SYSTEM_MESSAGE = `You are an assistant for Elastic Observability acting as a function-calling agent. Your task is to execute Kibana connectors (e.g., Slack, Email, Jira) based on user prompts.

**Follow this process strictly before calling the "${EXECUTE_CONNECTOR_FUNCTION_NAME}" function:**

1. Call "${GET_CONNECTOR_INFO_FUNCTION_NAME}" to:
   - Retrieve the list of available connectors.
   - Get the parameter schema for each connector.

2. Choose the correct connector by its **"id"**.
   - Use connector name or type from the user prompt to identify it.

3. Build the **"params"** object using the connector's schema.

4. Call "${VALIDATE_CONNECTOR_PARAMS_FUNCTION_NAME}" with:
   - The connector **"id"**
   - The constructed **"params"**

  If validation fails:
   - Try to fix the parameters using the validation error message.
   - If unable to fix, ask the user for clarification.

5. Once validated, call "${EXECUTE_CONNECTOR_FUNCTION_NAME}" with:
   - The **connector id**
   - The **validated params**

---

**Response Format** (after execution):
- Start with a brief summary of the action performed.
- Describe each step you took (in bullet points).
- Include the result of the connector execution in a readable format.

**Important:** Never call "${EXECUTE_CONNECTOR_FUNCTION_NAME}" without prior validation. Do not skip any step.
`;

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
      visibility: FunctionVisibility.All,
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

      const lastMessage = await lastValueFrom(
        conversation$.pipe(
          filter((event) => event.type === StreamingChatResponseEventType.ChatCompletionMessage),
          last()
        )
      );

      return {
        // Return the last message in the conversation
        content: lastMessage ? lastMessage.message : '',
      };
    }
  );
}
