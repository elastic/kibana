/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodSchema } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  BaseChatModel,
  type BaseChatModelParams,
  type BaseChatModelCallOptions,
  type BindToolsInput,
  type LangSmithParams,
} from '@langchain/core/language_models/chat_models';
import type { InteropZodType } from '@langchain/core/utils/types';
import type {
  BaseLanguageModelInput,
  StructuredOutputMethodOptions,
  ToolDefinition,
} from '@langchain/core/language_models/base';
import type { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { isInteropZodSchema } from '@langchain/core/utils/types';
import type { ChatResult, ChatGeneration } from '@langchain/core/outputs';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { OutputParserException } from '@langchain/core/output_parsers';
import type { Runnable } from '@langchain/core/runnables';
import { RunnablePassthrough, RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import type {
  InferenceConnector,
  ChatCompleteAPI,
  ChatCompleteOptions,
  FunctionCallingMode,
  ConnectorTelemetryMetadata,
  ChatCompleteResponse,
} from '@kbn/inference-common';
import {
  isChatCompletionChunkEvent,
  isChatCompletionTokenCountEvent,
  isToolValidationError,
  getConnectorDefaultModel,
  getConnectorProvider,
} from '@kbn/inference-common';
import type { ToolChoice } from './types';
import { toAsyncIterator, wrapInferenceError } from './utils';
import {
  messagesToInference,
  toolDefinitionToInference,
  toolChoiceToInference,
} from './to_inference';
import {
  completionChunkToLangchain,
  tokenCountChunkToLangchain,
  responseToLangchainMessage,
} from './from_inference';

export interface InferenceChatModelParams extends BaseChatModelParams {
  connector: InferenceConnector;
  chatComplete: ChatCompleteAPI;
  functionCallingMode?: FunctionCallingMode;
  temperature?: number;
  model?: string;
  signal?: AbortSignal;
  timeout?: number;
  telemetryMetadata?: ConnectorTelemetryMetadata;
}

export interface InferenceChatModelCallOptions extends BaseChatModelCallOptions {
  functionCallingMode?: FunctionCallingMode;
  tools?: BindToolsInput[];
  tool_choice?: ToolChoice;
  temperature?: number;
  model?: string;
  timeout?: number;
}

type InvocationParams = Omit<ChatCompleteOptions, 'messages' | 'system' | 'stream'>;

/**
 * Langchain chatModel utilizing the inference API under the hood for communication with the LLM.
 *
 * @example
 * ```ts
 * const chatModel = new InferenceChatModel({
 *    chatComplete: inference.chatComplete,
 *    connector: someConnector,
 *    logger: myPluginLogger
 * });
 *
 * // just use it as another langchain chatModel
 * ```
 */
export class InferenceChatModel extends BaseChatModel<InferenceChatModelCallOptions> {
  private readonly chatComplete: ChatCompleteAPI;
  private readonly connector: InferenceConnector;
  // @ts-ignore unused for now
  private readonly logger: Logger;
  private readonly telemetryMetadata?: ConnectorTelemetryMetadata;

  protected temperature?: number;
  protected functionCallingMode?: FunctionCallingMode;
  protected maxRetries?: number;
  protected model?: string;
  protected signal?: AbortSignal;
  protected timeout?: number;

  constructor(args: InferenceChatModelParams) {
    super(args);
    this.chatComplete = args.chatComplete;
    this.connector = args.connector;
    this.telemetryMetadata = args.telemetryMetadata;

    this.temperature = args.temperature;
    this.functionCallingMode = args.functionCallingMode;
    this.model = args.model;
    this.signal = args.signal;
    this.timeout = args.timeout;
    this.maxRetries = args.maxRetries;
  }

  static lc_name() {
    return 'InferenceChatModel';
  }

  public get callKeys() {
    return [
      ...super.callKeys,
      'functionCallingMode',
      'tools',
      'tool_choice',
      'temperature',
      'model',
    ];
  }

  getConnector() {
    return this.connector;
  }

  _llmType() {
    // TODO bedrock / gemini / openai / inference ?
    // ideally retrieve info from the inference API / connector
    // but the method is sync and we can't retrieve this info synchronously, so...
    return 'inference';
  }

  _modelType() {
    // TODO
    // Some agent / langchain stuff have behavior depending on the model type, so we use base_chat_model for now.
    // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
    return 'base_chat_model';
  }

  _identifyingParams() {
    return {
      model_name: this.model ?? getConnectorDefaultModel(this.connector),
      ...this.invocationParams({}),
    };
  }

  identifyingParams() {
    return this._identifyingParams();
  }

  getLsParams(options: this['ParsedCallOptions']): LangSmithParams {
    const params = this.invocationParams(options);
    return {
      ls_provider: `inference-${getConnectorProvider(this.connector).toLowerCase()}`,
      ls_model_name: options.model ?? this.model ?? getConnectorDefaultModel(this.connector),
      ls_model_type: 'chat',
      ls_temperature: params.temperature ?? this.temperature ?? undefined,
    };
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
      connectorId: this.connector.connectorId,
      functionCalling: options.functionCallingMode ?? this.functionCallingMode,
      modelName: options.model ?? this.model,
      temperature: options.temperature ?? this.temperature,
      tools: options.tools ? toolDefinitionToInference(options.tools) : undefined,
      toolChoice: options.tool_choice ? toolChoiceToInference(options.tool_choice) : undefined,
      abortSignal: options.signal ?? this.signal,
      maxRetries: this.maxRetries,
      metadata: { connectorTelemetry: this.telemetryMetadata },
      timeout: options.timeout ?? this.timeout,
    };
  }

  completionWithRetry = <TStream extends boolean | undefined = false>(
    request: ChatCompleteOptions & { stream?: TStream }
  ) => {
    return this.caller.call(async () => {
      try {
        return await this.chatComplete(request);
      } catch (e) {
        throw wrapInferenceError(e);
      }
    });
  };

  async _generate(
    baseMessages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const { system, messages } = messagesToInference(baseMessages);

    let response: ChatCompleteResponse;

    try {
      response = await this.completionWithRetry({
        ...this.invocationParams(options),
        system,
        messages,
        stream: false,
      });
    } catch (e) {
      // convert tool validation to output parser exception
      // for structured output calls
      if (isToolValidationError(e) && e.meta.toolCalls) {
        throw new OutputParserException(
          `Failed to parse. Error: ${e.message}`,
          JSON.stringify(e.meta.toolCalls)
        );
      }
      throw e;
    }

    const generations: ChatGeneration[] = [];
    generations.push({
      text: response.content,
      message: responseToLangchainMessage(response),
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
    const response$ = await this.completionWithRetry({
      ...this.invocationParams(options),
      system,
      messages,
      stream: true as const,
    });

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

  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
    outputSchema: InteropZodType<RunOutput> | Record<string, any>,
    config?: StructuredOutputMethodOptions<false>
  ): Runnable<BaseLanguageModelInput, RunOutput>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
    outputSchema: InteropZodType<RunOutput> | Record<string, any>,
    config?: StructuredOutputMethodOptions<true>
  ): Runnable<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }>;
  withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(
    outputSchema: InteropZodType<RunOutput> | Record<string, any>,
    config?: StructuredOutputMethodOptions<boolean>
  ):
    | Runnable<BaseLanguageModelInput, RunOutput>
    | Runnable<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }> {
    const schema: InteropZodType<RunOutput> | Record<string, any> = outputSchema;
    const name = config?.name;
    const description =
      'description' in schema && typeof schema.description === 'string'
        ? schema.description
        : 'A function available to call.';
    const includeRaw = config?.includeRaw;

    let functionName = name ?? 'extract';
    let tools: ToolDefinition[];
    if (isInteropZodSchema(schema)) {
      tools = [
        {
          type: 'function',
          function: {
            name: functionName,
            description,
            parameters: zodToJsonSchema(schema as unknown as ZodSchema),
          },
        },
      ];
    } else {
      if ('name' in schema) {
        functionName = schema.name;
      }
      tools = [
        {
          type: 'function',
          function: {
            name: functionName,
            description,
            parameters: schema,
          },
        },
      ];
    }

    const llm = this.bindTools(tools, { tool_choice: functionName });

    const outputParser = RunnableLambda.from<AIMessageChunk, RunOutput>(
      (input: AIMessageChunk): RunOutput => {
        if (!input.tool_calls || input.tool_calls.length === 0) {
          throw new Error('No tool calls found in the response.');
        }
        const toolCall = input.tool_calls.find((tc) => tc.name === functionName);
        if (!toolCall) {
          throw new Error(`No tool call found with name ${functionName}.`);
        }
        return toolCall.args as RunOutput;
      }
    );

    if (!includeRaw) {
      return llm.pipe(outputParser).withConfig({
        runName: 'StructuredOutput',
      }) as Runnable<BaseLanguageModelInput, RunOutput>;
    }

    const parserAssign = RunnablePassthrough.assign({
      parsed: (input: any, cfg) => outputParser.invoke(input.raw, cfg),
    });
    const parserNone = RunnablePassthrough.assign({
      parsed: () => null,
    });
    const parsedWithFallback = parserAssign.withFallbacks({
      fallbacks: [parserNone],
    });
    return RunnableSequence.from<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }>([
      {
        raw: llm,
      },
      parsedWithFallback,
    ]).withConfig({
      runName: 'StructuredOutputRunnable',
    });
  }

  // I have no idea what this is really doing or when this is called,
  // but most chatModels implement it while returning an empty object or array,
  // so I figured we should do the same
  _combineLLMOutput() {
    return {};
  }
}
