/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BaseChatModel,
  type BaseChatModelParams,
  type BaseChatModelCallOptions,
  type BindToolsInput,
} from '@langchain/core/language_models/chat_models';
import {
  ChatCompleteAPI,
  ChatCompleteOptions,
  FunctionCallingMode,
  ToolOptions,
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { type BaseMessage, AIMessage } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatGenerationChunk, ChatResult, ChatGeneration } from '@langchain/core/outputs';
import type { ToolChoice } from './types';
import { toAsyncIterator } from './utils/observable_to_generator';
import {
  messagesToInference,
  toolDefinitionToInference,
  toolChoiceToInference,
} from './to_inference';
import { completionChunkToLangchain, tokenCountChunkToLangchain } from './from_inference';

export interface InferenceChatModelParams
  extends BaseChatModelParams,
    Partial<InferenceChatModelCallOptions> {
  streaming: boolean;
  connectorId: string;
  chatComplete: ChatCompleteAPI;
}

export interface InferenceChatModelCallOptions extends BaseChatModelCallOptions {
  functionCallingMode?: FunctionCallingMode;
  tools?: BindToolsInput[];
  tool_choice?: ToolChoice;
  temperature?: number;
}

type InvocationParams = Omit<ChatCompleteOptions, 'messages' | 'system' | 'stream'>;

// TODO: retry support using completionWithRetry? or should we delegate to the inference plugin?
// https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-openai/src/chat_models.ts#L1838

// TODO: _combineLLMOutput ?
// https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-openai/src/chat_models.ts#L1944

// TODO: withStructuredOutput ?
// https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-openai/src/chat_models.ts#L1967

// TODO: _identifyingParams / identifyingParams ?

/**
 * Langchain chatModel utilizing the inference API under the hood for communication with the LLM.
 *
 * @example
 * ```ts
 * const chatModel = new InferenceChatModel({
 *    chatComplete: inference.chatComplete,
 *    connectorId: someConnectorId,
 * });
 *
 * // just use it as another langchain chatModel
 * ```
 */
export class InferenceChatModel extends BaseChatModel<InferenceChatModelCallOptions> {
  private chatComplete: ChatCompleteAPI;
  private connectorId: string;
  protected streaming: boolean;
  protected temperature?: number;
  protected functionCallingMode?: FunctionCallingMode;

  static lc_name() {
    return 'InferenceChatModel';
  }

  public get callKeys() {
    return [...super.callKeys, 'functionCallingMode', 'tools', 'tool_choice', 'temperature'];
  }

  constructor(args: InferenceChatModelParams) {
    super(args);
    this.chatComplete = args.chatComplete;
    this.connectorId = args.connectorId;
    this.streaming = args.streaming;
    this.temperature = args.temperature;
    this.functionCallingMode = args.functionCallingMode;
  }

  _llmType() {
    // ideally retrieve info from the inference API / connector
    // but the method is sync and we can't retrieve this info synchronously, so...
    return 'inference';
  }

  _modelType() {
    // Some agent / langchain stuff have behavior depending on the model type, so we use base_chat_model for now.
    // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
    return 'base_chat_model';
  }

  override bindTools(tools: BindToolsInput[], kwargs?: Partial<InferenceChatModelCallOptions>) {
    // conversion will be done at call time for simplicity's sake
    // so we just need to implement this method with the default behavior to support tools
    return this.bind({
      tools,
      ...kwargs,
    } as Partial<InferenceChatModelCallOptions>);
  }

  invocationParams(options: this['ParsedCallOptions']): InvocationParams {
    return {
      connectorId: this.connectorId,
      functionCalling: options.functionCallingMode,
      temperature: options.temperature,
      tools: options.tools ? toolDefinitionToInference(options.tools) : undefined,
      toolChoice: options.tool_choice ? toolChoiceToInference(options.tool_choice) : undefined,
      abortSignal: options.signal,
    };
  }

  async _generate(
    baseMessages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const { system, messages } = messagesToInference(baseMessages);
    const response = await this.chatComplete({
      ...this.invocationParams(options),
      system,
      messages,
      stream: false,
    });

    // TODO: ideally intercept and convert invalid tool call to OutputParserException
    //       as this is used by the structured output parser.

    const generations: ChatGeneration[] = [];
    generations.push({
      text: response.content,
      // TODO: extract
      message: new AIMessage({
        content: response.content,
        tool_calls: response.toolCalls.map((toolCall) => {
          return {
            id: toolCall.toolCallId,
            name: toolCall.function.name,
            args: toolCall.function.arguments,
            type: 'tool_call',
          };
        }),
      }),
    });

    return {
      generations,
      llmOutput: {
        ...(response.tokens
          ? {
              tokenUsage: {
                promptTokens: response.tokens.prompt,
                completionTokens: response.tokens.completion,
                totalTokens: response.tokens.total,
              },
            }
          : {}),
      },
    };
  }

  async *_streamResponseChunks(
    baseMessages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const { system, messages } = messagesToInference(baseMessages);
    const response$ = this.chatComplete({
      ...this.invocationParams(options),
      system,
      messages,
      stream: true as const,
    } as ChatCompleteOptions<ToolOptions, true>);

    const responseIterator = toAsyncIterator(response$);
    for await (const event of responseIterator) {
      if (isChatCompletionChunkEvent(event)) {
        const chunk = completionChunkToLangchain(event);
        const generationChunk = new ChatGenerationChunk({
          message: chunk,
          text: event.content,
          generationInfo: {},
        });

        yield generationChunk;
        await runManager?.handleLLMNewToken(
          generationChunk.text ?? '',
          { prompt: 0, completion: 0 },
          undefined,
          undefined,
          undefined,
          { chunk: generationChunk }
        );
      }

      if (isChatCompletionTokenCountEvent(event)) {
        const chunk = tokenCountChunkToLangchain(event);
        const generationChunk = new ChatGenerationChunk({
          text: '',
          message: chunk,
        });
        yield generationChunk;
      }

      if (options.signal?.aborted) {
        throw new Error('AbortError');
      }
    }
  }
}
