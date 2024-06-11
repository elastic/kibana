/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import {
  SimpleChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { type BaseMessage } from '@langchain/core/messages';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core-http-server';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash/fp';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { parseBedrockStream } from '../utils/bedrock';
import { getDefaultArguments } from './constants';

export const getMessageContentAndRole = (prompt: string, role = 'user') => ({
  content: prompt,
  role: role === 'human' ? 'user' : role,
});

export interface CustomChatModelInput extends BaseChatModelParams {
  actions: ActionsPluginStart;
  connectorId: string;
  logger: Logger;
  llmType?: string;
  signal?: AbortSignal;
  model?: string;
  temperature?: number;
  request: KibanaRequest;
  streaming: boolean;
}

export class ActionsClientSimpleChatModel extends SimpleChatModel {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest;
  #traceId: string;
  #signal?: AbortSignal;
  llmType: string;
  streaming: boolean;
  model?: string;
  temperature?: number;

  constructor({
    actions,
    connectorId,
    llmType,
    logger,
    model,
    request,
    temperature,
    signal,
    streaming,
  }: CustomChatModelInput) {
    super({});

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = uuidv4();
    this.#logger = logger;
    this.#signal = signal;
    this.#request = request;
    this.llmType = llmType ?? 'ActionsClientSimpleChatModel';
    this.model = model;
    this.temperature = temperature;
    // only enable streaming for bedrock
    this.streaming = streaming && llmType === 'bedrock';
  }

  _llmType() {
    return this.llmType;
  }

  // Model type needs to be `base_chat_model` to work with LangChain OpenAI Tools
  // We may want to make this configurable (ala _llmType) if different agents end up requiring different model types
  // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
  _modelType() {
    return 'base_chat_model';
  }

  async _call(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    if (!messages.length) {
      throw new Error('No messages provided.');
    }
    const formattedMessages = [];
    if (messages.length === 2) {
      messages.forEach((message, i) => {
        if (typeof message.content !== 'string') {
          throw new Error('Multimodal messages are not supported.');
        }
        formattedMessages.push(getMessageContentAndRole(message.content, message._getType()));
      });
    } else {
      if (typeof messages[0].content !== 'string') {
        throw new Error('Multimodal messages are not supported.');
      }
      formattedMessages.push(getMessageContentAndRole(messages[0].content));
    }
    this.#logger.debug(
      `ActionsClientSimpleChatModel#_call\ntraceId: ${
        this.#traceId
      }\nassistantMessage:\n${JSON.stringify(formattedMessages)} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        subAction: this.streaming ? 'invokeStream' : 'invokeAI',
        subActionParams: {
          model: this.model,
          messages: formattedMessages,
          ...getDefaultArguments(this.llmType, this.temperature, options.stop),
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `ActionsClientSimpleChatModel: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    if (!this.streaming) {
      const content = get('data.message', actionResult);

      if (typeof content !== 'string') {
        throw new Error(
          `ActionsClientSimpleChatModel: content should be a string, but it had an unexpected type: ${typeof content}`
        );
      }

      return content; // per the contact of _call, return a string
    }

    // Bedrock streaming
    const readable = get('data', actionResult) as Readable;

    if (typeof readable?.read !== 'function') {
      throw new Error('Action result status is error: result is not streamable');
    }

    let currentOutput = '';
    let finalOutputIndex = -1;
    const finalOutputStartToken = '"action":"FinalAnswer","action_input":"';
    let streamingFinished = false;
    const finalOutputStopRegex = /(?<!\\)\"/;
    const handleLLMNewToken = async (token: string) => {
      if (finalOutputIndex === -1) {
        // Remove whitespace to simplify parsing
        currentOutput += token.replace(/\s/g, '');
        if (currentOutput.includes(finalOutputStartToken)) {
          finalOutputIndex = currentOutput.indexOf(finalOutputStartToken);
        }
      } else if (!streamingFinished) {
        const finalOutputEndIndex = token.search(finalOutputStopRegex);
        if (finalOutputEndIndex !== -1) {
          streamingFinished = true;
        } else {
          await runManager?.handleLLMNewToken(token);
        }
      }
    };

    const parsed = await parseBedrockStream(
      readable,
      this.#logger,
      this.#signal,
      handleLLMNewToken
    );

    return parsed; // per the contact of _call, return a string
  }
}
