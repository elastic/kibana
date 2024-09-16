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
  InlineDataPart,
  POSSIBLE_ROLES,
  Part,
  TextPart,
  FinishReason,
  SafetyRating,
} from '@google/generative-ai';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { AIMessage } from '@langchain/core/messages';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ToolCallChunk } from '@langchain/core/dist/messages/tool';
import {
  isAIMessage,
  AIMessageChunk,
  BaseMessage,
  ChatMessage,
  isBaseMessage,
  UsageMetadata,
} from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { Logger } from '@kbn/logging';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { AbstractGoogleLLMConnection } from '@langchain/google-common';
import { get } from 'lodash/fp';
import { Readable } from 'stream';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
// import { baseMessageToContent } from '@langchain/google-common/dist/utils/gemini';
const DEFAULT_GEMINI_TEMPERATURE = 0;
function messageKwargsToParts(kwargs) {
  const ret = [];
  if (kwargs?.tool_calls) {
    ret.push(...messageToolCallsToParts(kwargs.tool_calls));
  }
  return ret;
}
function messageToolCallsToParts(toolCalls) {
  if (!toolCalls || toolCalls.length === 0) {
    return [];
  }
  return toolCalls.map((tool) => {
    let args = {};
    if (tool?.function?.arguments) {
      const argStr = tool.function.arguments;
      args = JSON.parse(argStr);
    }
    return {
      functionCall: {
        name: tool.function.name,
        args,
      },
    };
  });
}
function messageContentText(content) {
  if (content?.text && content?.text.length > 0) {
    return {
      text: content.text,
    };
  } else {
    return null;
  }
}
function messageContentImageUrl(content) {
  const url = typeof content.image_url === 'string' ? content.image_url : content.image_url.url;
  if (!url) {
    throw new Error('Missing Image URL');
  }
  const mineTypeAndData = extractMimeType(url);
  if (mineTypeAndData) {
    return {
      inlineData: mineTypeAndData,
    };
  } else {
    // FIXME - need some way to get mime type
    return {
      fileData: {
        mimeType: 'image/png',
        fileUri: url,
      },
    };
  }
}
function messageContentToParts(content) {
  // Convert a string to a text type MessageContent if needed
  const messageContent =
    typeof content === 'string'
      ? [
          {
            type: 'text',
            text: content,
          },
        ]
      : content;

  const parts = messageContent
    .map((content) => {
      switch (content.type) {
        case 'text':
          if ('text' in content) {
            return messageContentText(content);
          }
          break;
        case 'image_url':
          if ('image_url' in content) {
            // Type guard for MessageContentImageUrl
            return messageContentImageUrl(content);
          }
          break;
        case 'media':
          return messageContentMedia(content);
        default:
          throw new Error(`Unsupported type received while converting message to message parts`);
      }
      throw new Error(`Cannot coerce "${content.type}" message part into a string.`);
    })
    .reduce((acc, val) => {
      if (val) {
        return [...acc, val];
      } else {
        return acc;
      }
    }, []);
  return parts;
}
function roleMessageToContent(role, message) {
  const contentParts = messageContentToParts(message.content);
  let toolParts;
  if (isAIMessage(message) && !!message.tool_calls?.length) {
    toolParts = message.tool_calls.map((toolCall) => ({
      functionCall: {
        name: toolCall.name,
        args: toolCall.args,
      },
    }));
  } else {
    toolParts = messageKwargsToParts(message.additional_kwargs);
  }
  const parts = [...contentParts, ...toolParts];
  return [
    {
      role,
      parts,
    },
  ];
}
function systemMessageToContent(message, useSystemInstruction) {
  return useSystemInstruction
    ? roleMessageToContent('system', message)
    : [
        ...roleMessageToContent('user', message),
        ...roleMessageToContent('model', new AIMessage('Ok')),
      ];
}
function toolMessageToContent(message, prevMessage) {
  const contentStr =
    typeof message.content === 'string'
      ? message.content
      : message.content.reduce((acc, content) => {
          if (content.type === 'text') {
            return acc + content.text;
          } else {
            return acc;
          }
        }, '');
  // Hacky :(
  const responseName =
    (isAIMessage(prevMessage) && !!prevMessage.tool_calls?.length
      ? prevMessage.tool_calls[0].name
      : prevMessage.name) ?? message.tool_call_id;
  try {
    const content = JSON.parse(contentStr);
    return [
      {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: responseName,
              response: { content },
            },
          },
        ],
      },
    ];
  } catch (_) {
    return [
      {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: responseName,
              response: { content: contentStr },
            },
          },
        ],
      },
    ];
  }
}
function baseMessageToContent(message, prevMessage, useSystemInstruction) {
  const type = message._getType();
  switch (type) {
    case 'system':
      return systemMessageToContent(message, useSystemInstruction);
    case 'human':
      return roleMessageToContent('user', message);
    case 'ai':
      return roleMessageToContent('model', message);
    case 'tool':
      if (!prevMessage) {
        throw new Error('Tool messages cannot be the first message passed to the model.');
      }
      return toolMessageToContent(message, prevMessage);
    default:
      console.log(`Unsupported message type: ${type}`);
      return [];
  }
}
export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

// not sure why these properties are not on the type, as they are on the data
interface SafetyReason extends SafetyRating {
  blocked: boolean;
  severity: string;
}

class ChatConnection<AuthOptions> extends AbstractGoogleLLMConnection<BaseMessage[], AuthOptions> {
  convertSystemMessageToHumanContent: boolean;
  constructor(fields, caller, client, streaming) {
    super(fields, caller, client, streaming);
    Object.defineProperty(this, 'convertSystemMessageToHumanContent', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0,
    });
    this.convertSystemMessageToHumanContent = fields?.convertSystemMessageToHumanContent ?? true;
    this.model = 'gemini';
    console.log('3334 this', this);
    console.log('3334 fields', fields);
  }
  get useSystemInstruction() {
    return true;
  }
  get computeUseSystemInstruction() {
    // This works on models from April 2024 and later
    //   Vertex AI: gemini-1.5-pro and gemini-1.0-002 and later
    //   AI Studio: gemini-1.5-pro-latest
    if (this.modelFamily === 'palm') {
      return false;
    } else if (this.modelName === 'gemini-1.0-pro-001') {
      return false;
    } else if (this.modelName.startsWith('gemini-pro-vision')) {
      return false;
    } else if (this.modelName.startsWith('gemini-1.0-pro-vision')) {
      return false;
    } else if (this.modelName === 'gemini-pro' && this.platform === 'gai') {
      // on AI Studio gemini-pro is still pointing at gemini-1.0-pro-001
      return false;
    }
    return true;
  }
  formatContents(input, _parameters) {
    return input
      .map((msg, i) => baseMessageToContent(msg, input[i - 1], this.useSystemInstruction))
      .reduce((acc, cur) => {
        // Filter out the system content
        if (cur.every((content) => content.role === 'system')) {
          return acc;
        }
        // Combine adjacent function messages
        if (
          cur[0]?.role === 'function' &&
          acc.length > 0 &&
          acc[acc.length - 1].role === 'function'
        ) {
          acc[acc.length - 1].parts = [...acc[acc.length - 1].parts, ...cur[0].parts];
        } else {
          acc.push(...cur);
        }
        return acc;
      }, []);
  }
  formatSystemInstruction(input, _parameters) {
    if (!this.useSystemInstruction) {
      return {};
    }
    let ret = {};
    input.forEach((message, index) => {
      if (message._getType() === 'system') {
        // For system types, we only want it if it is the first message,
        // if it appears anywhere else, it should be an error.
        if (index === 0) {
          ret = baseMessageToContent(message, undefined, true)[0];
        } else {
          throw new Error('System messages are only permitted as the first passed message.');
        }
      }
    });
    return ret;
  }
}

export interface CoolThing extends ChatConnection {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

// only implements non-streaming requests
// stream is handled by ActionsClientChatVertexAI.*_streamResponseChunks
class ActionsClientGoogleAIConnection<AuthOptions> extends ChatConnection<AuthOptions> {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  temperature: number;
  model?: string;
  constructor(fields, caller, client, streaming, actionsClient, connectorId) {
    super(fields, caller, client, false);
    Object.defineProperty(this, 'convertSystemMessageToHumanContent', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0,
    });

    this.convertSystemMessageToHumanContent = fields?.convertSystemMessageToHumanContent ?? true;
    console.log('23334 BEHERE', { actionsClient, connectorId });

    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    this.temperature = fields.temperature;
    this.model = fields.model;
  }

  async _request(data, options) {
    return this.caller.callWithOptions({ signal: options?.signal }, async () => {
      try {
        const requestBody = {
          actionId: this.connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              model: this.model,
              messages: data?.contents,
              tools: data?.tools,
              temperature: this.temperature,
            },
          },
        };
        const actionResult = (await this.actionsClient.execute(requestBody)) as {
          status: string;
          data: EnhancedGenerateContentResponse;
          message?: string;
          serviceMessage?: string;
        };

        if (actionResult.status === 'error') {
          throw new Error(
            `ActionsClientChatVertexAI: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
          );
        }

        if (actionResult.data.candidates && actionResult.data.candidates.length > 0) {
          // handle bad finish reason
          const errorMessage = convertResponseBadFinishReasonToErrorMsg(actionResult.data);
          if (errorMessage != null) {
            throw new Error(errorMessage);
          }
        }
        return actionResult;
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

    this.connection = new ActionsClientGoogleAIConnection(
      {
        ...this,
      },
      this.caller,
      () => {},
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

const badFinishReasons = [FinishReason.RECITATION, FinishReason.SAFETY];
function hadBadFinishReason(candidate: { finishReason?: FinishReason }) {
  return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}

export function convertResponseBadFinishReasonToErrorMsg(
  response: EnhancedGenerateContentResponse
): string | null {
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (hadBadFinishReason(candidate)) {
      if (
        candidate.finishReason === FinishReason.SAFETY &&
        candidate.safetyRatings &&
        (candidate.safetyRatings?.length ?? 0) > 0
      ) {
        const safetyReasons = getSafetyReasons(candidate.safetyRatings as SafetyReason[]);
        return `ActionsClientChatVertexAI: action result status is error. Candidate was blocked due to ${candidate.finishReason} - ${safetyReasons}`;
      } else {
        return `ActionsClientChatVertexAI: action result status is error. Candidate was blocked due to ${candidate.finishReason}`;
      }
    }
  }
  return null;
}

const getSafetyReasons = (safetyRatings: SafetyReason[]) => {
  const reasons = safetyRatings.filter((t: SafetyReason) => t.blocked);
  return reasons.reduce(
    (acc: string, t: SafetyReason, i: number) =>
      `${acc.length ? `${acc} ` : ''}${t.category}: ${t.severity}${
        i < reasons.length - 1 ? ',' : ''
      }`,
    ''
  );
};
