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
import { AIMessageChunk, type BaseMessage } from '@langchain/core/messages';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { Logger } from '@kbn/logging';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'lodash/fp';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { parseGeminiStreamAsAsyncIterator, parseGeminiStream } from '../utils/gemini';
import { parseBedrockStreamAsAsyncIterator, parseBedrockStream } from '../utils/bedrock';
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
  telemetryMetadata?: TelemetryMetadata;
}

function _formatMessages(messages: BaseMessage[]) {
  if (!messages.length) {
    throw new Error('No messages provided.');
  }
  return messages.map((message) => {
    if (typeof message.content !== 'string') {
      throw new Error('Multimodal messages are not supported.');
    }
    return getMessageContentAndRole(message.content, message._getType());
  });
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
  telemetryMetadata?: TelemetryMetadata;

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
    telemetryMetadata,
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
    this.telemetryMetadata = telemetryMetadata;
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
    const formattedMessages = _formatMessages(messages);
    this.#logger.debug(
      () =>
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
          telemetryMetadata: {
            pluginId: this.telemetryMetadata?.pluginId,
            aggregateBy: this.telemetryMetadata?.aggregateBy,
          },
          ...getDefaultArguments(this.llmType, this.temperature, options.stop, this.#maxTokens),
        },
      },
    };

    const actionResult = await this.#actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      const error = new Error(
        `ActionsClientSimpleChatModel: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
      if (actionResult?.serviceMessage) {
        error.name = actionResult?.serviceMessage;
      }
      throw error;
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
    const finalOutputStopRegex = /(?<!\\)"/;
    const handleLLMNewToken = async (token: string) => {
      if (finalOutputIndex === -1) {
        currentOutput += token;
        // Remove whitespace to simplify parsing
        const noWhitespaceOutput = currentOutput.replace(/\s/g, '');
        if (noWhitespaceOutput.includes(finalOutputStartToken)) {
          const nonStrippedToken = '"action_input": "';
          finalOutputIndex = currentOutput.indexOf(nonStrippedToken);
          const contentStartIndex = finalOutputIndex + nonStrippedToken.length;
          const extraOutput = currentOutput.substring(contentStartIndex);
          if (extraOutput.length > 0) {
            await runManager?.handleLLMNewToken(extraOutput);
          }
        }
      } else if (!streamingFinished) {
        const finalOutputEndIndex = token.search(finalOutputStopRegex);
        if (finalOutputEndIndex !== -1) {
          streamingFinished = true;
          const extraOutput = token.substring(0, finalOutputEndIndex);
          streamingFinished = true;
          if (extraOutput.length > 0) {
            await runManager?.handleLLMNewToken(extraOutput);
          }
        } else {
          await runManager?.handleLLMNewToken(token);
        }
      }
    };
    const streamParser = this.llmType === 'bedrock' ? parseBedrockStream : parseGeminiStream;

    const parsed = await streamParser(readable, this.#logger, this.#signal, handleLLMNewToken);

    return parsed; // per the contact of _call, return a string
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun | undefined
  ): AsyncGenerator<ChatGenerationChunk> {
    const formattedMessages = _formatMessages(messages);
    this.#logger.debug(
      () =>
        `ActionsClientSimpleChatModel#stream\ntraceId: ${
          this.#traceId
        }\nassistantMessage:\n${JSON.stringify(formattedMessages)} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        subAction: 'invokeStream',
        subActionParams: {
          model: this.model,
          messages: formattedMessages,
          telemetryMetadata: {
            pluginId: this.telemetryMetadata?.pluginId,
            aggregateBy: this.telemetryMetadata?.aggregateBy,
          },
          ...getDefaultArguments(this.llmType, this.temperature, options.stop, this.#maxTokens),
        },
      },
    };
    const actionResult = await this.#actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      const error = new Error(
        `ActionsClientSimpleChatModel: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
      if (actionResult?.serviceMessage) {
        error.name = actionResult?.serviceMessage;
      }
      throw error;
    }

    const readable = get('data', actionResult) as Readable;

    if (typeof readable?.read !== 'function') {
      throw new Error('Action result status is error: result is not streamable');
    }

    const streamParser =
      this.llmType === 'bedrock'
        ? parseBedrockStreamAsAsyncIterator
        : parseGeminiStreamAsAsyncIterator;
    for await (const token of streamParser(readable, this.#logger, this.#signal)) {
      yield new ChatGenerationChunk({
        message: new AIMessageChunk({ content: token }),
        text: token,
      });
      await runManager?.handleLLMNewToken(token);
    }
  }
}
