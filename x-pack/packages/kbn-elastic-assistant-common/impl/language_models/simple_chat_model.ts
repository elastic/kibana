/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SimpleChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { type BaseMessage } from '@langchain/core/messages';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core-http-server';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash/fp';

export const getMessageContentAndRole = (prompt: string, role = 'user') => ({
  content: prompt,
  role,
});

export interface CustomChatModelInput extends BaseChatModelParams {
  actions: ActionsPluginStart;
  connectorId: string;
  logger: Logger;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
}

export class ActionsClientSimpleChatModel extends SimpleChatModel {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  #traceId: string;

  constructor({ actions, connectorId, logger, request }: CustomChatModelInput) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = uuidv4();
    this.#logger = logger;
    this.#request = request;
  }

  _llmType() {
    return 'custom';
  }

  async _call(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    if (!messages.length) {
      throw new Error('No messages provided.');
    }
    const bedrockMessages = [];
    if (messages.length === 2) {
      messages.forEach((message, i) => {
        if (typeof message.content !== 'string') {
          throw new Error('Multimodal messages are not supported.');
        }
        bedrockMessages.push(getMessageContentAndRole(message.content, message._getType()));
      });
    } else {
      if (typeof messages[0].content !== 'string') {
        throw new Error('Multimodal messages are not supported.');
      }
      bedrockMessages.push(getMessageContentAndRole(messages[0].content));
    }
    this.#logger.debug(
      `ActionsClientSimpleChatModel#_call\ntraceId: ${
        this.#traceId
      }\nassistantMessage:\n${JSON.stringify(bedrockMessages)} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        // hard code to non-streaming subaction as this class only supports non-streaming
        subAction: 'invokeAI',
        subActionParams: {
          model: this.#request.body.model,
          messages: bedrockMessages, // the assistant message
          temperature: 0,
          stopSequences: options?.stop,
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `ChatBedrock: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    const content = get('data.message', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `ChatBedrock: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }

    return content; // per the contact of _call, return a string
  }
}
