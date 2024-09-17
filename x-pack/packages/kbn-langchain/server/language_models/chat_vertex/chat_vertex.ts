/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Content, EnhancedGenerateContentResponse } from '@google/generative-ai';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { BaseMessage, UsageMetadata } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { get } from 'lodash/fp';
import { Readable } from 'stream';

import { Logger } from '@kbn/logging';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import {
  convertBaseMessagesToContent,
  convertResponseBadFinishReasonToErrorMsg,
  convertResponseContentToChatGenerationChunk,
} from '../../utils/gemini';
import { ActionsClientChatConnection } from './connection';

const DEFAULT_GEMINI_TEMPERATURE = 0;
export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  streaming: boolean;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

export class ActionsClientChatVertexAI extends ChatVertexAI {
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  #model?: string;
  constructor({ actionsClient, connectorId, ...props }: CustomChatModelInput) {
    super({
      ...props,
      maxOutputTokens: props.maxTokens ?? 2048,
      temperature: props.temperature ?? DEFAULT_GEMINI_TEMPERATURE,
    });
    // LangChain needs model to be defined for logging purposes
    this.model = props.model ?? this.model;
    // If model is not specified by consumer, the connector will define it so do not pass
    // a LangChain default to the actionsClient
    this.#model = props.model;
    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
    const client = this.buildClient(props);
    this.connection = new ActionsClientChatConnection(
      {
        ...this,
      },
      this.caller,
      client,
      false,
      actionsClient,
      connectorId
    );
  }

  buildConnection() {
    // prevent ChatVertexAI from overwriting our this.connection defined in super
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const prompt = convertBaseMessagesToContent(messages, false);
    const parameters = this.invocationParams(options);
    const request = {
      ...parameters,
      contents: prompt,
    };

    const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
      const requestBody = {
        actionId: this.#connectorId,
        params: {
          subAction: 'invokeStream',
          subActionParams: {
            model: this.#model,
            messages: request.contents.reduce((acc: Content[], item) => {
              if (!acc?.length) {
                acc.push(item);
                return acc;
              }

              if (acc[acc.length - 1].role === item.role) {
                acc[acc.length - 1].parts = acc[acc.length - 1].parts.concat(item.parts);
                return acc;
              }

              acc.push(item);
              return acc;
            }, []),
            temperature: this.temperature,
            tools: request.tools,
          },
        },
      };

      const actionResult = await this.#actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        throw new Error(
          `ActionsClientChatVertexAI: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
        );
      }

      const readable = get('data', actionResult) as Readable;

      if (typeof readable?.read !== 'function') {
        throw new Error('Action result status is error: result is not streamable');
      }
      return readable;
    });
    let usageMetadata: UsageMetadata | undefined;
    let index = 0;
    let partialStreamChunk = '';
    for await (const rawStreamChunk of stream) {
      const streamChunk = rawStreamChunk.toString();
      const nextChunk = `${partialStreamChunk + streamChunk}`;

      let parsedStreamChunk: EnhancedGenerateContentResponse | null = null;
      try {
        parsedStreamChunk = JSON.parse(nextChunk.replaceAll('data: ', '').replaceAll('\r\n', ''));
        partialStreamChunk = '';
      } catch (_) {
        partialStreamChunk += nextChunk;
      }

      if (parsedStreamChunk !== null && !parsedStreamChunk.candidates?.[0]?.finishReason) {
        const response = {
          ...parsedStreamChunk,
          functionCalls: () =>
            parsedStreamChunk?.candidates?.[0]?.content.parts[0].functionCall
              ? [parsedStreamChunk.candidates?.[0]?.content.parts[0].functionCall]
              : [],
        };

        if (
          'usageMetadata' in response &&
          this.streamUsage !== false &&
          options.streamUsage !== false
        ) {
          const genAIUsageMetadata = response.usageMetadata as {
            promptTokenCount: number;
            candidatesTokenCount: number;
            totalTokenCount: number;
          };
          if (!usageMetadata) {
            usageMetadata = {
              input_tokens: genAIUsageMetadata.promptTokenCount,
              output_tokens: genAIUsageMetadata.candidatesTokenCount,
              total_tokens: genAIUsageMetadata.totalTokenCount,
            };
          } else {
            // Under the hood, LangChain combines the prompt tokens. Google returns the updated
            // total each time, so we need to find the difference between the tokens.
            const outputTokenDiff =
              genAIUsageMetadata.candidatesTokenCount - usageMetadata.output_tokens;
            usageMetadata = {
              input_tokens: 0,
              output_tokens: outputTokenDiff,
              total_tokens: outputTokenDiff,
            };
          }
        }

        const chunk = convertResponseContentToChatGenerationChunk(response, {
          usageMetadata,
          index,
        });
        index += 1;

        if (chunk) {
          yield chunk;
          await runManager?.handleLLMNewToken(chunk.text ?? '');
        }
      } else if (parsedStreamChunk) {
        // handle bad finish reason
        const errorMessage = convertResponseBadFinishReasonToErrorMsg(parsedStreamChunk);
        if (errorMessage != null) {
          throw new Error(errorMessage);
        }
      }
    }
  }
}
