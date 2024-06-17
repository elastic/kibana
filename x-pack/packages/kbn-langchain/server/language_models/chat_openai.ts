/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { get } from 'lodash/fp';

import { ChatOpenAI } from '@langchain/openai';
import { Stream } from 'openai/streaming';
import type OpenAI from 'openai';
import { DEFAULT_OPEN_AI_MODEL, DEFAULT_TIMEOUT } from './constants';
import { InvokeAIActionParamsSchema, RunActionParamsSchema } from './types';

const LLM_TYPE = 'ActionsClientChatOpenAI';

export interface ActionsClientChatOpenAIParams {
  actions: ActionsPluginStart;
  connectorId: string;
  llmType?: string;
  logger: Logger;
  request: KibanaRequest;
  streaming?: boolean;
  traceId?: string;
  maxRetries?: number;
  maxTokens?: number;
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  timeout?: number;
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
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest;
  #actionResultData: string;
  #traceId: string;
  #signal?: AbortSignal;
  #timeout?: number;

  constructor({
    actions,
    connectorId,
    traceId = uuidv4(),
    llmType,
    logger,
    request,
    maxRetries,
    model,
    signal,
    streaming = true,
    temperature,
    timeout,
    maxTokens,
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
    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = traceId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#request = request;
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
      const requestBody = this.formatRequestForActionsClient(completionRequest);
      this.#logger.debug(
        `${LLM_TYPE}#completionWithRetry ${this.#traceId} assistantMessage:\n${JSON.stringify(
          requestBody.params.subActionParams
        )} `
      );

      // create an actions client from the authenticated request context:
      const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

      const actionResult = await actionsClient.execute(requestBody);

      if (actionResult.status === 'error') {
        throw new Error(`${LLM_TYPE}: ${actionResult?.message} - ${actionResult?.serviceMessage}`);
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
      | OpenAI.ChatCompletionCreateParamsStreaming
  ): {
    actionId: string;
    params: {
      subActionParams: InvokeAIActionParamsSchema | RunActionParamsSchema;
      subAction: string;
    };
    signal?: AbortSignal;
  } {
    const body = {
      temperature: this.#temperature,
      // possible client model override
      // security sends this from connectors, it is only missing from preconfigured connectors
      // this should be undefined otherwise so the connector handles the model (stack_connector has access to preconfigured connector model values)
      model: this.model,
      // ensure we take the messages from the completion request, not the client request
      n: completionRequest.n,
      stop: completionRequest.stop,
      functions: completionRequest.functions,
      messages: completionRequest.messages.map((message) => ({
        role: message.role,
        content: message.content ?? '',
        ...('name' in message ? { name: message?.name } : {}),
        ...('function_call' in message ? { function_call: message?.function_call } : {}),
        ...('tool_calls' in message ? { tool_calls: message?.tool_calls } : {}),
        ...('tool_call_id' in message ? { tool_call_id: message?.tool_call_id } : {}),
      })),
    };
    // create a new connector request body with the assistant message:
    return {
      actionId: this.#connectorId,
      params: {
        // langchain expects stream to be of type AsyncIterator<OpenAI.ChatCompletionChunk>
        // for non-stream, use `run` instead of `invokeAI` in order to get the entire OpenAI.ChatCompletion response,
        // which may contain non-content messages like functions
        subAction: completionRequest.stream ? 'invokeAsyncIterator' : 'run',
        subActionParams: {
          ...(completionRequest.stream ? body : { body: JSON.stringify(body) }),
          signal: this.#signal,
          // This timeout is large because LangChain prompts can be complicated and take a long time
          timeout: this.#timeout ?? DEFAULT_TIMEOUT,
        },
      },
      signal: this.#signal,
    };
  }
}
