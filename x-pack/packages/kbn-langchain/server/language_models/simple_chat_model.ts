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
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash/fp';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { PublicMethodsOf } from '@kbn/utility-types';
import { parseGeminiStream } from '../utils/gemini';
import { parseBedrockStream } from '../utils/bedrock';
import { getDefaultArguments } from './constants';

export const getMessageContentAndRole = (prompt: string, role = 'user') => ({
  content: prompt,
  role: role === 'human' ? 'user' : role,
});

export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  llmType?: string;
  signal?: AbortSignal;
  model?: string;
  temperature?: number;
  streaming: boolean;
  maxTokens?: number;
}

export class ActionsClientSimpleChatModel extends SimpleChatModel {
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  #logger: Logger;
  #traceId: string;
  #signal?: AbortSignal;
  #maxTokens?: number;
  llmType: string;
  streaming: boolean;
  model?: string;
  temperature?: number;

  constructor({
    actionsClient,
    connectorId,
    llmType,
    logger,
    model,
    temperature,
    signal,
    streaming,
    maxTokens,
  }: CustomChatModelInput) {
    super({});

    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
    this.#traceId = uuidv4();
    this.#logger = logger;
    this.#signal = signal;
    this.#maxTokens = maxTokens;
    this.llmType = llmType ?? 'ActionsClientSimpleChatModel';
    this.model = model;
    this.temperature = temperature;
    this.streaming = streaming;
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
    const formattedMessages: Array<{ content: string; role: string }> = [];
    messages.forEach((message, i) => {
      if (typeof message.content !== 'string') {
        throw new Error('Multimodal messages are not supported.');
      }
      formattedMessages.push(getMessageContentAndRole(message.content, message._getType()));
    });
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
          ...getDefaultArguments(this.llmType, this.temperature, options.stop, this.#maxTokens),
        },
      },
    };

    const actionResult = await this.#actionsClient.execute(requestBody);

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
    const streamParser = this.llmType === 'bedrock' ? parseBedrockStream : parseGeminiStream;

    const parsed = await streamParser(readable, this.#logger, this.#signal, handleLLMNewToken);

    return parsed; // per the contact of _call, return a string
  }
}
