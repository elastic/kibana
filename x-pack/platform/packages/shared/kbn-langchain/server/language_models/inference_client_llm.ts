/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LLM } from '@langchain/core/language_models/llms';
import type { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';
import type { InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { Logger } from '@kbn/core/server';
import { EmptyModelResponseError } from './empty_model_response_error';

const LLM_TYPE = 'InferenceClientLlm';

export interface InferenceClientLlmInput {
  connectorId: string;
  inferenceClient: InferenceClient;
  logger: Logger;
  llmType?: string; // e.g. 'anthropic', 'openai' — used for logging/telemetry
  model?: string;
  temperature?: number;
  timeout?: number;
  systemPrompt?: string;
  telemetryMetadata?: Record<string, string>;
}

/**
 * LangChain-compatible LLM that calls the Kibana Inference plugin directly.
 *
 * Use this for inference endpoint connectors (actionTypeId === '.inference').
 * It has no dependency on the Actions framework and is therefore immune to
 * Actions-layer changes that broke Attack Discovery in INC-2847.
 *
 * Note: InferenceClientLlm extends LLM (LangChain's completion base class string in, string out)
 * but overrides `_modelType()` to return `'base_chat_model'`. This is borrowed from `ActionsClientLlm`
 * where the same trick is used, but that class wraps the Actions layer which can behave as a chat model
 * under the hood. Here, `chatComplete` is explicitly a chat API, which means the semantically correct
 * base class is `BaseChatModel`. Using `LLM` + `_modelType()` override is a pragmatic workaround today,
 * but it might mislead future contributors and could break silently when LangChain uses `_modelType()`
 * for routing decisions in a future version.
 */
export class InferenceClientLlm extends LLM<BaseLanguageModelCallOptions> {
  readonly #connectorId: string;
  readonly #inferenceClient: InferenceClient;
  readonly #logger: Logger;

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  readonly #model: string | undefined;
  readonly #temperature: number;
  readonly #timeout: number | undefined;
  readonly #systemPrompt: string | undefined;
  readonly #telemetryMetadata: Record<string, string> | undefined;

  constructor({
    connectorId,
    inferenceClient,
    logger,
    llmType,
    model,
    temperature = 0,
    timeout,
    systemPrompt,
    telemetryMetadata,
  }: InferenceClientLlmInput) {
    super({});
    this.#connectorId = connectorId;
    this.#inferenceClient = inferenceClient;
    this.#logger = logger;
    this.llmType = llmType ?? LLM_TYPE;
    this.#model = model;
    this.#temperature = temperature;
    this.#timeout = timeout;
    this.#systemPrompt = systemPrompt;
    this.#telemetryMetadata = telemetryMetadata;
  }

  _llmType(): string {
    return this.llmType;
  }

  _modelType() {
    return 'base_chat_model';
  }

  async _call(prompt: string): Promise<string> {
    this.#logger.debug(
      () => `${LLM_TYPE}: calling chatComplete for connector ${this.#connectorId}`
    );

    // The failure handler stays attached to the transport call itself: an empty *successful*
    // completion is not a chatComplete error and must not be reported as one.
    const response = await this.#inferenceClient
      .chatComplete({
        connectorId: this.#connectorId,
        messages: [{ role: MessageRole.User, content: prompt }],
        temperature: this.#temperature,
        ...(this.#model ? { modelName: this.#model } : {}),
        ...(this.#timeout ? { timeout: this.#timeout } : {}),
        ...(this.#systemPrompt ? { system: this.#systemPrompt } : {}),
        ...(this.#telemetryMetadata ? { metadata: this.#telemetryMetadata } : {}),
      })
      .catch((error: unknown) => {
        const err = error as Error & { code?: string };
        this.#logger.error(
          `${LLM_TYPE}: chatComplete failed for connector ${this.#connectorId}: ${err.code} - ${
            err.message
          }`
        );
        throw error;
      });

    this.#throwIfResponseIsEmpty({
      completionTokens: response.tokens?.completion,
      content: response.content,
      model: response.model ?? this.#model,
      promptTokens: response.tokens?.prompt,
      toolCallCount: response.toolCalls?.length,
    });

    return response.content;
  }

  /**
   * Throws (and logs at `error`, i.e. persisted) when a model returns a successful completion with no
   * content. Returning the empty string instead would surface much later as an unrelated failure in
   * whatever parses the completion (for the Attack Discovery evaluation that means a JSON parse
   * error), which hides both the real cause and the connector that produced it. On serverless there
   * is no log-level switch that would let support recover the response bytes afterwards.
   */
  #throwIfResponseIsEmpty({
    completionTokens,
    content,
    model,
    promptTokens,
    toolCallCount,
  }: {
    completionTokens?: number;
    content: string;
    model?: string;
    promptTokens?: number;
    toolCallCount?: number;
  }): void {
    // a tool-call-only response is not empty; the guard must not trip for a future tool-using caller
    if (content.trim().length > 0 || (toolCallCount ?? 0) > 0) {
      return;
    }

    // NOTE: unlike ActionsClientLlm there is no trace id in scope here — this class has never had
    // one and the caller does not pass one, so the error is narrowed to what is actually known.
    const error = new EmptyModelResponseError({
      completionTokens,
      connectorId: this.#connectorId,
      contentLength: content.length,
      model,
      promptTokens,
      responseBody: content,
    });

    this.#logger.error(error);

    throw error;
  }
}
