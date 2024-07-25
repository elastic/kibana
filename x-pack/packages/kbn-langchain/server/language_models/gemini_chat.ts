/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Content,
  EnhancedGenerateContentResponse,
  FunctionCallPart,
  FunctionResponsePart,
  GenerateContentRequest,
  GenerateContentResult,
  InlineDataPart,
  POSSIBLE_ROLES,
  Part,
  TextPart,
} from '@google/generative-ai';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ToolCallChunk } from '@langchain/core/dist/messages/tool';
import {
  AIMessageChunk,
  BaseMessage,
  ChatMessage,
  isBaseMessage,
  UsageMetadata,
} from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Logger } from '@kbn/logging';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { get } from 'lodash/fp';
import { Readable } from 'stream';
const DEFAULT_GEMINI_TEMPERATURE = 0;

export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

export class ActionsClientGeminiChatModel extends ChatGoogleGenerativeAI {
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  #temperature: number;
  #model?: string;

  constructor({ actionsClient, connectorId, ...props }: CustomChatModelInput) {
    super({
      ...props,
      apiKey: 'asda',
      maxOutputTokens: props.maxTokens ?? 2048,
    });
    // LangChain needs model to be defined for logging purposes
    this.model = props.model ?? this.model;
    // If model is not specified by consumer, the connector will defin eit so do not pass
    // a LangChain default to the actionsClient
    this.#model = props.model;
    this.#temperature = props.temperature ?? DEFAULT_GEMINI_TEMPERATURE;
    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
  }

  async completionWithRetry(
    request: string | GenerateContentRequest | Array<string | Part>,
    options?: this['ParsedCallOptions']
  ): Promise<GenerateContentResult> {
    return this.caller.callWithOptions({ signal: options?.signal }, async () => {
      try {
        const requestBody = {
          actionId: this.#connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              model: this.#model,
              messages: request,
              temperature: this.#temperature,
            },
          },
        };

        const actionResult = (await this.#actionsClient.execute(requestBody)) as {
          status: string;
          data: EnhancedGenerateContentResponse;
          message?: string;
          serviceMessage?: string;
        };

        if (actionResult.status === 'error') {
          throw new Error(
            `ActionsClientGeminiChatModel: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
          );
        }

        return {
          response: {
            ...actionResult.data,
            functionCalls: () =>
              actionResult.data?.candidates?.[0]?.content?.parts[0].functionCall
                ? [actionResult.data?.candidates?.[0]?.content.parts[0].functionCall]
                : [],
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        // TODO: Improve error handling
        if (e.message?.includes('400 Bad Request')) {
          e.status = 400;
        }
        throw e;
      }
    });
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const prompt = convertBaseMessagesToContent(messages, this._isMultimodalModel);
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
            temperature: this.#temperature,
            tools: request.tools,
          },
        },
      };

      const actionResult = await this.#actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        throw new Error(
          `ActionsClientGeminiChatModel: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
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
      }
    }
  }
}

export function convertResponseContentToChatGenerationChunk(
  response: EnhancedGenerateContentResponse,
  extra: {
    usageMetadata?: UsageMetadata | undefined;
    index: number;
  }
): ChatGenerationChunk | null {
  if (!response.candidates || response.candidates.length === 0) {
    return null;
  }
  const functionCalls = response.functionCalls();
  const [candidate] = response.candidates;
  const { content, ...generationInfo } = candidate;
  const text = content?.parts[0]?.text ?? '';

  const toolCallChunks: ToolCallChunk[] = [];
  if (functionCalls) {
    toolCallChunks.push(
      ...functionCalls.map((fc) => ({
        ...fc,
        args: JSON.stringify(fc.args),
        index: extra.index,
        type: 'tool_call_chunk' as const,
      }))
    );
  }
  return new ChatGenerationChunk({
    text,
    message: new AIMessageChunk({
      content: text,
      name: !content ? undefined : content.role,
      tool_call_chunks: toolCallChunks,
      // Each chunk can have unique "generationInfo", and merging strategy is unclear,
      // so leave blank for now.
      additional_kwargs: {},
      usage_metadata: extra.usageMetadata,
    }),
    generationInfo,
  });
}

export function convertAuthorToRole(author: string): (typeof POSSIBLE_ROLES)[number] {
  switch (author) {
    /**
     *  Note: Gemini currently is not supporting system messages
     *  we will convert them to human messages and merge with following
     * */
    case 'ai':
    case 'model': // getMessageAuthor returns message.name. code ex.: return message.name ?? type;
      return 'model';
    case 'system':
    case 'human':
      return 'user';
    case 'tool':
    case 'function':
      return 'function';
    default:
      throw new Error(`Unknown / unsupported author: ${author}`);
  }
}
export function convertBaseMessagesToContent(messages: BaseMessage[], isMultimodalModel: boolean) {
  return messages.reduce<{
    content: Content[];
    mergeWithPreviousContent: boolean;
  }>(
    (acc, message, index) => {
      if (!isBaseMessage(message)) {
        throw new Error('Unsupported message input');
      }
      const author = getMessageAuthor(message);
      if (author === 'system' && index !== 0) {
        throw new Error('System message should be the first one');
      }
      const role = convertAuthorToRole(author);
      const parts = convertMessageContentToParts(message, isMultimodalModel);

      if (acc.mergeWithPreviousContent) {
        const prevContent = acc.content[acc.content.length - 1];
        if (!prevContent) {
          throw new Error(
            'There was a problem parsing your system message. Please try a prompt without one.'
          );
        }
        prevContent.parts.push(...parts);

        return {
          mergeWithPreviousContent: false,
          content: acc.content,
        };
      }
      let actualRole = role;
      if (actualRole === 'function') {
        // GenerativeAI API will throw an error if the role is not "user" or "model."
        actualRole = 'user';
      }
      const content: Content = {
        role: actualRole,
        parts,
      };
      return {
        mergeWithPreviousContent: author === 'system',
        content: [...acc.content, content],
      };
    },
    { content: [], mergeWithPreviousContent: false }
  ).content;
}

export function convertMessageContentToParts(
  message: BaseMessage,
  isMultimodalModel: boolean
): Part[] {
  if (typeof message.content === 'string' && message.content !== '') {
    return [{ text: message.content }];
  }

  let functionCalls: FunctionCallPart[] = [];
  let functionResponses: FunctionResponsePart[] = [];
  let messageParts: Part[] = [];

  if (
    'tool_calls' in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  ) {
    functionCalls = message.tool_calls.map((tc) => ({
      functionCall: {
        name: tc.name,
        args: tc.args,
      },
    }));
  } else if (message._getType() === 'tool' && message.name && message.content) {
    functionResponses = [
      {
        functionResponse: {
          name: message.name,
          response: message.content,
        },
      },
    ];
  } else if (Array.isArray(message.content)) {
    messageParts = message.content.map((c) => {
      if (c.type === 'text') {
        return {
          text: c.text,
        } as TextPart;
      }

      if (c.type === 'image_url') {
        if (!isMultimodalModel) {
          throw new Error(`This model does not support images`);
        }
        let source;
        if (typeof c.image_url === 'string') {
          source = c.image_url;
        } else if (typeof c.image_url === 'object' && 'url' in c.image_url) {
          source = c.image_url.url;
        } else {
          throw new Error('Please provide image as base64 encoded data URL');
        }
        const [dm, data] = source.split(',');
        if (!dm.startsWith('data:')) {
          throw new Error('Please provide image as base64 encoded data URL');
        }

        const [mimeType, encoding] = dm.replace(/^data:/, '').split(';');
        if (encoding !== 'base64') {
          throw new Error('Please provide image as base64 encoded data URL');
        }

        return {
          inlineData: {
            data,
            mimeType,
          },
        } as InlineDataPart;
      } else if (c.type === 'media') {
        return messageContentMedia(c);
      } else if (c.type === 'tool_use') {
        return {
          functionCall: {
            name: c.name,
            args: c.input,
          },
        } as FunctionCallPart;
      }
      throw new Error(`Unknown content type ${(c as { type: string }).type}`);
    });
  }

  return [...messageParts, ...functionCalls, ...functionResponses];
}

export function getMessageAuthor(message: BaseMessage) {
  const type = message._getType();
  if (ChatMessage.isInstance(message)) {
    return message.role;
  }
  if (type === 'tool') {
    return type;
  }
  return message.name ?? type;
}

// will be removed once FileDataPart is supported in @langchain/google-genai
function messageContentMedia(content: Record<string, unknown>): InlineDataPart {
  if ('mimeType' in content && 'data' in content) {
    return {
      inlineData: {
        mimeType: content.mimeType,
        data: content.data,
      },
    } as InlineDataPart;
  }
  throw new Error('Invalid media content');
}
