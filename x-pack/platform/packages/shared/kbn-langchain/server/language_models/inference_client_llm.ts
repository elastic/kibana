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

    try {
      const response = await this.#inferenceClient.chatComplete({
        connectorId: this.#connectorId,
        messages: [{ role: MessageRole.User, content: prompt }],
        temperature: this.#temperature,
        ...(this.#model ? { modelName: this.#model } : {}),
        ...(this.#timeout ? { timeout: this.#timeout } : {}),
        ...(this.#systemPrompt ? { system: this.#systemPrompt } : {}),
        ...(this.#telemetryMetadata ? { metadata: this.#telemetryMetadata } : {}),
      });

      return response.content;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      this.#logger.error(
        `${LLM_TYPE}: chatComplete failed for connector ${this.#connectorId}: ${err.code} - ${
          err.message
        }`
      );
      throw error;
    }
  }
}
