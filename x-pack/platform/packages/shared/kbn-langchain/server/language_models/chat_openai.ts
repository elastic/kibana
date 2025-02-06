/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { get } from 'lodash/fp';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { ChatOpenAI } from '@langchain/openai';
import { Stream } from 'openai/streaming';
import type OpenAI from 'openai';
import { PublicMethodsOf } from '@kbn/utility-types';

import { DEFAULT_OPEN_AI_MODEL, DEFAULT_TIMEOUT } from './constants';
import {
  InferenceChatCompleteParamsSchema,
  InvokeAIActionParamsSchema,
  RunActionParamsSchema,
} from './types';

const LLM_TYPE = 'ActionsClientChatOpenAI';

export interface ActionsClientChatOpenAIParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  llmType?: string;
  logger: Logger;
  streaming?: boolean;
  traceId?: string;
  maxRetries?: number;
  maxTokens?: number;
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  timeout?: number;
  telemetryMetadata?: TelemetryMetadata;
}

/**
 * This class is a wrapper around the ChatOpenAI class from @langchain/openai.
 * It is used to call the OpenAI API via the Actions plugin.
 * It is used by the OpenAI connector type only.
 * The completionWithRetry method is overridden to use the Actions plugin.
 * In the ChatOpenAI class, *_streamResponseChunks calls completionWithRetry
 * and iterates over the chunks to form the response.
 */
export class ActionsClientChatOpenAI extends ChatOpenAI {
  streaming: boolean;
  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;
  // ChatOpenAI class needs these, but they do not matter as we override the openai client with the actions client
  azureOpenAIApiKey = '';
  openAIApiKey = '';
  model: string;
  #temperature?: number;

  // Kibana variables
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  #logger: Logger;
  #actionResultData: string;
  #traceId: string;
  #signal?: AbortSignal;
  #timeout?: number;
  telemetryMetadata?: TelemetryMetadata;

  constructor({
    actionsClient,
    connectorId,
    traceId = uuidv4(),
    llmType,
    logger,
    maxRetries,
    model,
    signal,
    streaming = true,
    temperature,
    timeout,
    maxTokens,
    telemetryMetadata,
  }: ActionsClientChatOpenAIParams) {
    super({
      maxRetries,
      maxTokens,
      streaming,
      // matters only for the LangSmith logs (Metadata > Invocation Params), which are misleading if this is not set
      modelName: model ?? DEFAULT_OPEN_AI_MODEL,
      // these have to be initialized, but are not actually used since we override the openai client with the actions client
      azureOpenAIApiKey: 'nothing',
      azureOpenAIApiDeploymentName: 'nothing',
      azureOpenAIApiInstanceName: 'nothing',
      azureOpenAIBasePath: 'nothing',
      azureOpenAIApiVersion: 'nothing',
      openAIApiKey: '',
    });
    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
    this.#traceId = traceId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#timeout = timeout;
    this.#actionResultData = '';
    this.streaming = streaming;
    this.#signal = signal;
    this.model = model ?? DEFAULT_OPEN_AI_MODEL;
    // to be passed to the actions client
    this.#temperature = temperature;
    // matters only for LangSmith logs (Metadata > Invocation Params)
    // the connector can be passed an undefined temperature through #temperature
    this.temperature = temperature ?? this.temperature;
    this.telemetryMetadata = telemetryMetadata;
  }

  getActionResultData(): string {
    return this.#actionResultData;
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

  async completionWithRetry(
    request: OpenAI.ChatCompletionCreateParamsStreaming
  ): Promise<AsyncIterable<OpenAI.ChatCompletionChunk>>;

  async completionWithRetry(
    request: OpenAI.ChatCompletionCreateParamsNonStreaming
  ): Promise<OpenAI.ChatCompletion>;

  async completionWithRetry(
    completionRequest:
      | OpenAI.ChatCompletionCreateParamsStreaming
      | OpenAI.ChatCompletionCreateParamsNonStreaming
  ): Promise<AsyncIterable<OpenAI.ChatCompletionChunk> | OpenAI.ChatCompletion> {
    return this.caller.call(async () => {
      const requestBody = this.formatRequestForActionsClient(completionRequest, this.llmType);
      this.#logger.debug(
        () =>
          `${LLM_TYPE}#completionWithRetry ${this.#traceId} assistantMessage:\n${JSON.stringify(
            requestBody.params.subActionParams
          )} `
      );

      const actionResult = await this.#actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        const error = new Error(
          `${LLM_TYPE}: ${actionResult?.message} - ${actionResult?.serviceMessage}`
        );
        if (actionResult?.serviceMessage) {
          error.name = actionResult?.serviceMessage;
        }
        throw error;
      }

      if (!this.streaming) {
        // typecasting as the `run` subaction returns the OpenAI.ChatCompletion directly from OpenAI
        const chatCompletion = get('data', actionResult) as OpenAI.ChatCompletion;

        return chatCompletion;
      }

      // cast typing as this is the contract of the actions client
      const result = get('data', actionResult) as {
        consumerStream: Stream<OpenAI.ChatCompletionChunk>;
        tokenCountStream: Stream<OpenAI.ChatCompletionChunk>;
      };

      if (result.consumerStream == null) {
        throw new Error(`${LLM_TYPE}: action result data is empty ${actionResult}`);
      }

      return result.consumerStream;
    });
  }
  formatRequestForActionsClient(
    completionRequest:
      | OpenAI.ChatCompletionCreateParamsNonStreaming
      | OpenAI.ChatCompletionCreateParamsStreaming,
    llmType: string
  ): {
    actionId: string;
    params: {
      subActionParams:
        | InvokeAIActionParamsSchema
        | RunActionParamsSchema
        | InferenceChatCompleteParamsSchema;
      subAction: string;
    };
    signal?: AbortSignal;
  } {
    const body = {
      temperature: this.#temperature,
      // possible client model override
      // security sends this from connectors, it is only missing from preconfigured connectors
      // this should be undefined otherwise so the connector handles the model (stack_connector has access to preconfigured connector model values)
      ...(llmType === 'inference' ? {} : { model: this.model }),
      n: completionRequest.n,
      stop: completionRequest.stop,
      tools: completionRequest.tools,
      ...(completionRequest.tool_choice ? { tool_choice: completionRequest.tool_choice } : {}),
      // deprecated, use tools
      ...(completionRequest.functions ? { functions: completionRequest?.functions } : {}),
      // ensure we take the messages from the completion request, not the client request
      messages: completionRequest.messages.map((message) => ({
        role: message.role,
        content: message.content ?? '',
        ...('name' in message ? { name: message?.name } : {}),
        ...('tool_calls' in message ? { tool_calls: message?.tool_calls } : {}),
        ...('tool_call_id' in message ? { tool_call_id: message?.tool_call_id } : {}),
        // deprecated, use tool_calls
        ...('function_call' in message ? { function_call: message?.function_call } : {}),
      })),
    };
    const subAction =
      llmType === 'inference'
        ? completionRequest.stream
          ? 'unified_completion_async_iterator'
          : 'unified_completion'
        : // langchain expects stream to be of type AsyncIterator<OpenAI.ChatCompletionChunk>
        // for non-stream, use `run` instead of `invokeAI` in order to get the entire OpenAI.ChatCompletion response,
        // which may contain non-content messages like functions
        completionRequest.stream
        ? 'invokeAsyncIterator'
        : 'run';
    // create a new connector request body with the assistant message:
    const subActionParams = {
      ...(llmType === 'inference'
        ? { body }
        : completionRequest.stream
        ? { ...body, timeout: this.#timeout ?? DEFAULT_TIMEOUT }
        : { body: JSON.stringify(body), timeout: this.#timeout ?? DEFAULT_TIMEOUT }),
      telemetryMetadata: this.telemetryMetadata,
      signal: this.#signal,
    };
    return {
      actionId: this.#connectorId,
      params: {
        subAction,
        subActionParams,
      },
      signal: this.#signal,
    };
  }
}
