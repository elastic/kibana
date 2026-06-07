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
}

/**
 * LangChain-compatible LLM that calls the Kibana Inference plugin directly.
 *
 * Use this for inference endpoint connectors (actionTypeId === '.inference').
 * It has no dependency on the Actions framework and is therefore immune to
 * Actions-layer changes that broke Attack Discovery in INC-2847.
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

  constructor({
    connectorId,
    inferenceClient,
    logger,
    llmType,
    model,
    temperature = 0,
    timeout,
  }: InferenceClientLlmInput) {
    super({});
    this.#connectorId = connectorId;
    this.#inferenceClient = inferenceClient;
    this.#logger = logger;
    this.llmType = llmType ?? LLM_TYPE;
    this.#model = model;
    this.#temperature = temperature;
    this.#timeout = timeout;
  }

  _llmType(): string {
    return this.llmType;
  }

  // Model type needs to be `base_chat_model` to work with LangChain OpenAI Tools
  // We may want to make this configurable (ala _llmType) if different agents end up requiring different model types
  _modelType() {
    return 'base_chat_model';
  }

  async _call(prompt: string): Promise<string> {
    this.#logger.debug(
      () => `${LLM_TYPE}: calling chatComplete for connector ${this.#connectorId}`
    );

    const response = await this.#inferenceClient.chatComplete({
      connectorId: this.#connectorId,
      messages: [{ role: MessageRole.User, content: prompt }],
      temperature: this.#temperature,
      ...(this.#model ? { modelName: this.#model } : {}),
      ...(this.#timeout ? { timeout: this.#timeout } : {}),
    });

    return response.content;
  }
}
