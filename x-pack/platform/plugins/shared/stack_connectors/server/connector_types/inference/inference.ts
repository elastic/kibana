/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { text as streamToString } from 'node:stream/consumers';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { errors } from '@elastic/elasticsearch';
import type {
  ElasticsearchClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { GEN_AI_SETTINGS_INFERENCE_STREAMING } from '@kbn/management-settings-ids';
import { supportsNonStreamingChat, type InferenceProvider } from '@kbn/inference-common';
import { Stream } from 'openai/streaming';
import type { Readable } from 'stream';

import type { AxiosError } from 'axios';
import type {
  InferenceInferenceRequest,
  InferenceInferenceResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { isUserError } from '@kbn/task-manager-plugin/server/task_running';
import { trace } from '@opentelemetry/api';
import type { Observable } from 'rxjs';
import { filter, from, identity, map, mergeMap, tap } from 'rxjs';
import type OpenAI from 'openai';
import type { ChatCompletionChunk } from 'openai/resources';
import {
  SUB_ACTION,
  ChatCompleteParamsSchema,
  RerankParamsSchema,
  SparseEmbeddingParamsSchema,
  TextEmbeddingParamsSchema,
  UnifiedChatCompleteParamsSchema,
} from '@kbn/connector-schemas/inference';
import type {
  Config,
  Secrets,
  RerankParams,
  RerankResponse,
  SparseEmbeddingParams,
  SparseEmbeddingResponse,
  TextEmbeddingParams,
  TextEmbeddingResponse,
  UnifiedChatCompleteParams,
  UnifiedChatCompleteResponse,
  DashboardActionParams,
  DashboardActionResponse,
  ChatCompleteParams,
  ChatCompleteResponse,
} from '@kbn/connector-schemas/inference';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import {
  chunksIntoMessage,
  eventSourceStreamIntoObservable,
  detectandThrowUserError,
  buildInferenceErrorMessage,
  truncateUpstreamBody,
} from './helpers';
import { completionToEventStream } from './non_streaming';

// 4xx are the caller's fault, 5xx the provider's. A 429 without the `quota` marker is a transient
// provider rate limit, not a user quota error (the quota carve-out is thrown earlier by
// `detectandThrowUserError`), so it stays framework-side.
const errorSourceForStatus = (statusCode: number): TaskErrorSource =>
  statusCode >= 500 || statusCode === 429 ? TaskErrorSource.FRAMEWORK : TaskErrorSource.USER;

export interface InferenceConnectorDependencies {
  /** Resolves a uiSettings client for the request's space; absent when settings cannot be read. */
  getUiSettingsClient?: (
    savedObjectsClient: SavedObjectsClientContract
  ) => Promise<IUiSettingsClient>;
  /**
   * Resolves the internal-user ES client, used to read `GET _inference/_services` because the
   * user running the connector is not expected to hold inference management privileges.
   */
  getInternalEsClient?: () => Promise<ElasticsearchClient>;
}

export class InferenceConnector extends SubActionConnector<Config, Secrets> {
  // Not using Axios for requests, but errors may be Axios-shaped or Elasticsearch client ResponseError-shaped.
  // Must never throw, otherwise the original (upstream) error is lost.
  protected getResponseErrorMessage(error: AxiosError): string {
    return buildInferenceErrorMessage(error);
  }

  private inferenceId;
  private taskType;
  private getUiSettingsClient?: InferenceConnectorDependencies['getUiSettingsClient'];
  private getInternalEsClient?: InferenceConnectorDependencies['getInternalEsClient'];

  constructor(
    params: ServiceParams<Config, Secrets>,
    { getUiSettingsClient, getInternalEsClient }: InferenceConnectorDependencies = {}
  ) {
    super(params);
    this.getUiSettingsClient = getUiSettingsClient;
    this.getInternalEsClient = getInternalEsClient;

    this.provider = this.config.provider;
    this.taskType = this.config.taskType;
    this.inferenceId = this.config.inferenceId;
    this.logger = this.logger;
    this.connectorID = this.connector.id;
    this.connectorTokenClient = params.services.connectorTokenClient;

    this.registerSubActions();
  }

  private registerSubActions() {
    // non-streaming unified completion task
    this.registerSubAction({
      name: SUB_ACTION.UNIFIED_COMPLETION,
      method: 'performApiUnifiedCompletion',
      schema: UnifiedChatCompleteParamsSchema,
    });

    // streaming unified completion task
    this.registerSubAction({
      name: SUB_ACTION.UNIFIED_COMPLETION_STREAM,
      method: 'performApiUnifiedCompletionStream',
      schema: UnifiedChatCompleteParamsSchema,
    });

    // streaming unified completion task for langchain
    this.registerSubAction({
      name: SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR,
      method: 'performApiUnifiedCompletionAsyncIterator',
      schema: UnifiedChatCompleteParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.RERANK,
      method: 'performApiRerank',
      schema: RerankParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.SPARSE_EMBEDDING,
      method: 'performApiSparseEmbedding',
      schema: SparseEmbeddingParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEXT_EMBEDDING,
      method: 'performApiTextEmbedding',
      schema: TextEmbeddingParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.COMPLETION,
      method: 'performApiCompletion',
      schema: ChatCompleteParamsSchema,
    });
  }

  /**
   * responsible for making a esClient inference method to perform chat completion task endpoint and returning the service response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiUnifiedCompletion(
    params: UnifiedChatCompleteParams
  ): Promise<UnifiedChatCompleteResponse> {
    const res = await this.performApiUnifiedCompletionStream(params);

    const obs$ = from(eventSourceStreamIntoObservable(res as unknown as Readable)).pipe(
      filter((line) => !!line && line !== '[DONE]'),
      map((line) => {
        return JSON.parse(line) as
          | OpenAI.ChatCompletionChunk
          | { error: { message?: string; reason?: string } };
      }),
      tap((line) => {
        if ('error' in line) {
          throw new Error(
            truncateUpstreamBody(line.error.message || line.error.reason || 'Unknown error')
          );
        }
        if (
          'choices' in line &&
          line.choices.length &&
          line.choices[0].finish_reason === 'length'
        ) {
          throw new Error('createTokenLimitReachedError()');
        }
      }),
      filter((line): line is OpenAI.ChatCompletionChunk => {
        return 'object' in line && line.object === 'chat.completion.chunk';
      }),
      mergeMap((chunk): Observable<UnifiedChatCompleteResponse> => {
        const events: UnifiedChatCompleteResponse[] = [];
        events.push({
          choices: chunk.choices.map((c) => ({
            message: {
              tool_calls: c.delta.tool_calls?.map((t) => ({
                index: t.index,
                id: t.id,
                function: t.function,
                type: t.type,
              })),
              content: c.delta.content,
              refusal: c.delta.refusal,
              role: c.delta.role,
            },
            finish_reason: c.finish_reason,
            index: c.index,
          })),
          id: chunk.id,
          model: chunk.model,
          object: chunk.object,
          usage: chunk.usage,
        });
        return from(events);
      }),
      identity
    );

    return chunksIntoMessage(obs$);
  }

  /**
   * responsible for making a esClient inference method to perform chat completion task endpoint and returning the service response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiUnifiedCompletionStream(params: UnifiedChatCompleteParams) {
    const parentSpan = trace.getActiveSpan();
    const body = { ...params.body, n: undefined }; // exclude n param for now, constant is used on the inference API side
    if (parentSpan?.isRecording()) {
      parentSpan.setAttribute('inference.raw_request', JSON.stringify(body));
    }
    const headers = {
      // always send a value for EIS
      'X-Elastic-Product-Use-Case': params.telemetryMetadata?.pluginId ?? 'inference',
    };

    if (!(await this.shouldStream())) {
      const completion = await this.performApiUnifiedCompletionNonStreaming(body, params, headers);
      return completionToEventStream(completion);
    }

    const response = await this.esClient.transport.request<UnifiedChatCompleteResponse>(
      {
        method: 'POST',
        path: `_inference/chat_completion/${this.inferenceId}/_stream`,
        querystring: {
          timeout: '180s',
        },
        body,
      },
      {
        asStream: true,
        meta: true,
        requestTimeout: 180_000,
        signal: params.signal,
        headers: {
          ...headers,
          // asStream bypasses the transport's decompression step, so explicitly request
          // an uncompressed response to avoid receiving raw gzipped bytes as SSE events.
          'accept-encoding': 'identity',
        },
      }
    );
    // errors should be thrown as it will not be a stream response
    if (response.statusCode >= 400) {
      let error: string;
      try {
        error = await streamToString(response.body as unknown as Readable);
      } catch (cause) {
        throw createTaskRunError(
          new Error(
            truncateUpstreamBody(
              `Inference endpoint [${this.inferenceId}] returned status code ${
                response.statusCode
              }; upstream body stream failed: ${buildInferenceErrorMessage(cause)}`
            )
          ),
          errorSourceForStatus(response.statusCode)
        );
      }
      this.throwInferenceStatusError(response.statusCode, error);
    }

    return response.body;
  }

  /**
   * Calls the chat completion endpoint without `_stream` and waits for the full response.
   */
  private async performApiUnifiedCompletionNonStreaming(
    body: UnifiedChatCompleteParams['body'],
    params: UnifiedChatCompleteParams,
    headers: Record<string, string>
  ): Promise<UnifiedChatCompleteResponse> {
    try {
      return await this.esClient.transport.request<UnifiedChatCompleteResponse>(
        {
          method: 'POST',
          path: `_inference/chat_completion/${this.inferenceId}`,
          querystring: { timeout: '180s' },
          body,
        },
        { requestTimeout: 180_000, signal: params.signal, headers }
      );
    } catch (error) {
      if (error instanceof errors.ResponseError) {
        const upstream = error.meta.body;
        this.throwInferenceStatusError(
          error.statusCode ?? 500,
          typeof upstream === 'string' ? upstream : JSON.stringify(upstream)
        );
      }
      throw error;
    }
  }

  private throwInferenceStatusError(statusCode: number, error: string): never {
    detectandThrowUserError(error);
    const message = `Inference endpoint [${this.inferenceId}] returned status code ${statusCode}${
      error ? `: ${error}` : ''
    }`;
    throw createTaskRunError(
      new Error(truncateUpstreamBody(message)),
      errorSourceForStatus(statusCode)
    );
  }

  /**
   * Streaming is the default. Non-streaming is only used when the space setting turns streaming
   * off AND the endpoint's service advertises non-streaming chat completion support, so the toggle
   * never sends a request Elasticsearch would reject. Any failure falls back to streaming.
   */
  private async shouldStream(): Promise<boolean> {
    if (!this.getUiSettingsClient || !this.getInternalEsClient) {
      return true;
    }
    try {
      const uiSettingsClient = await this.getUiSettingsClient(this.savedObjectsClient);
      // only an explicit opt-out disables streaming; an unset setting keeps the default
      if ((await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_INFERENCE_STREAMING)) !== false) {
        return true;
      }
      // the services lookup runs as the internal user; this.esClient is scoped to the caller
      const internalEsClient = await this.getInternalEsClient();
      const services = await internalEsClient.transport.request<
        Array<Pick<InferenceProvider, 'service' | 'features'>>
      >({ method: 'GET', path: '/_inference/_services' });
      const service = Array.isArray(services)
        ? services.find(({ service: name }) => name === this.config.provider)
        : undefined;
      if (!supportsNonStreamingChat(service)) {
        this.logger.debug(
          `Streaming is disabled but inference service [${this.config.provider}] does not advertise non-streaming chat completion support, streaming`
        );
        return true;
      }
      this.logger.debug(
        `Streaming is disabled, calling inference endpoint [${this.inferenceId}] without _stream`
      );
      return false;
    } catch (error) {
      this.logger.warn(
        `Could not resolve the inference streaming mode, falling back to streaming: ${buildInferenceErrorMessage(
          error
        )}`
      );
      return true;
    }
  }

  /**
   * Streamed requests (langchain)
   * @param params - the request body
   * @returns {
   *  consumerStream: Stream<UnifiedChatCompleteResponse>; the result to be read/transformed on the server and sent to the client via Server Sent Events
   *  tokenCountStream: Stream<UnifiedChatCompleteResponse>; the result for token counting stream
   * }
   */
  public async performApiUnifiedCompletionAsyncIterator(
    params: UnifiedChatCompleteParams & { signal?: AbortSignal },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<{
    consumerStream: Stream<ChatCompletionChunk>;
    tokenCountStream: Stream<ChatCompletionChunk>;
  }> {
    try {
      connectorUsageCollector.addRequestBodyBytes(undefined, params.body);
      const res = await this.performApiUnifiedCompletionStream(params);
      const controller = new AbortController();
      // splits the stream in two, one is used for the UI and other for token tracking

      const stream = Stream.fromSSEResponse<ChatCompletionChunk>(
        { body: res } as unknown as Response,
        controller
      );
      const teed = stream.tee();
      return { consumerStream: teed[0], tokenCountStream: teed[1] };
      // since we do not use the sub action connector request method, we need to do our own error handling
    } catch (e) {
      if (isUserError(e)) {
        // Bubble up user errors as-is
        throw e;
      }
      const errorMessage = this.getResponseErrorMessage(e);
      if (e instanceof Error) {
        try {
          e.message = errorMessage;
        } catch (assignmentError) {
          // frozen / getter-only `message`: keep the enriched text rather than masking the failure
          throw new Error(errorMessage, { cause: e });
        }
        throw e;
      }
      throw new Error(errorMessage, { cause: e });
    }
  }

  /**
   * responsible for making a esClient inference method to rerank task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task. input can be a single string or an array.
   * @query the search query text
   * @signal abort signal
   */
  public async performApiRerank({
    input,
    query,
    signal,
  }: RerankParams & { signal?: AbortSignal }): Promise<RerankResponse> {
    const response = await this.performInferenceApi(
      {
        query,
        inference_id: this.inferenceId,
        input,
        task_type: 'rerank',
      },
      false,
      signal
    );
    return (response?.rerank ?? []).map(({ relevance_score: score, ...rest }) => ({
      score,
      ...rest,
    }));
  }

  /**
   * responsible for making a esClient inference method sparse embedding task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiSparseEmbedding({
    input,
    signal,
  }: SparseEmbeddingParams & { signal?: AbortSignal }): Promise<SparseEmbeddingResponse> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: 'sparse_embedding' },
      false,
      signal
    );
    return response?.sparse_embedding ?? [];
  }

  /**
   * responsible for making a esClient inference method text embedding task endpoint and returning the response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiTextEmbedding({
    input,
    inputType,
    signal,
  }: TextEmbeddingParams & { signal?: AbortSignal }): Promise<TextEmbeddingResponse> {
    const response = await this.performInferenceApi(
      {
        inference_id: this.inferenceId,
        input,
        task_type: 'text_embedding',
        task_settings: {
          input_type: inputType,
        },
      },
      false,
      signal
    );
    return response?.text_embedding ?? [];
  }

  /**
   * private generic method to avoid duplication esClient inference inference execute.
   * @param params InferenceInferenceRequest params.
   * @param asStream defines the type of the responce, regular or stream
   * @signal abort signal
   */
  private async performInferenceApi(
    params: InferenceInferenceRequest,
    asStream = false,
    signal?: AbortSignal
  ): Promise<InferenceInferenceResponse> {
    try {
      const response = await this.esClient?.inference.inference(params, { asStream, signal });
      this.logger.info(
        `Perform Inference endpoint for task type "${this.taskType}" and inference id ${this.inferenceId}`
      );
      // TODO: const usageMetadata = response?.data?.usageMetadata;
      return response;
    } catch (err) {
      this.logger.error(`error perform inference endpoint API: ${buildInferenceErrorMessage(err)}`);
      throw err;
    }
  }

  /**
   * responsible for making a esClient inference method to perform chat completetion task endpoint and returning the service response data
   * @param input the text on which you want to perform the inference task.
   * @signal abort signal
   */
  public async performApiCompletion({
    input,
    signal,
  }: ChatCompleteParams & { signal?: AbortSignal }): Promise<ChatCompleteResponse> {
    const response = await this.performInferenceApi(
      { inference_id: this.inferenceId, input, task_type: 'completion' },
      false,
      signal
    );
    return response?.completion ?? [];
  }

  /**
   *  retrieves a dashboard from the Kibana server and checks if the
   *  user has the necessary privileges to access it.
   * @param dashboardId The ID of the dashboard to retrieve.
   */
  public async getDashboard({
    dashboardId,
  }: DashboardActionParams): Promise<DashboardActionResponse> {
    const privilege = (await this.esClient.transport.request({
      path: '/_security/user/_has_privileges',
      method: 'POST',
      body: {
        index: [
          {
            names: ['.kibana-event-log-*'],
            allow_restricted_indices: true,
            privileges: ['read'],
          },
        ],
      },
    })) as { has_all_requested: boolean };

    if (!privilege?.has_all_requested) {
      return { available: false };
    }

    const response = await initDashboard({
      logger: this.logger,
      savedObjectsClient: this.savedObjectsClient,
      dashboardId,
      genAIProvider: 'Inference',
    });

    return { available: response.success };
  }
}
