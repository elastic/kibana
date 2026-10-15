/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import { LLM } from '@langchain/core/language_models/llms';
import { get } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import type { InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { DEFAULT_TIMEOUT, getDefaultArguments } from './constants';

import { getMessageContentAndRole } from './helpers';
import type { TraceOptions } from './types';

const LLM_TYPE = 'ActionsClientLlm';

interface ActionsClientLlmParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  inferenceClient?: InferenceClient;
  isInferenceEndpoint?: boolean;
  llmType?: string;
  logger: Logger;
  model?: string;
  temperature?: number;
  timeout?: number;
  traceId?: string;
  traceOptions?: TraceOptions;
  telemetryMetadata?: TelemetryMetadata;
}

export class ActionsClientLlm extends LLM {
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  #inferenceClient?: InferenceClient;
  #isInferenceEndpoint: boolean;
  #logger: Logger;
  #traceId: string;
  #timeout?: number;
  telemetryMetadata?: TelemetryMetadata;

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  model?: string;
  temperature?: number;

  constructor({
    actionsClient,
    connectorId,
    inferenceClient,
    isInferenceEndpoint = false,
    traceId = uuidv4(),
    llmType,
    logger,
    model,
    temperature,
    timeout,
    traceOptions,
    telemetryMetadata,
  }: ActionsClientLlmParams) {
    super({
      callbacks: [...(traceOptions?.tracers ?? [])],
    });

    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
    this.#inferenceClient = inferenceClient;
    this.#isInferenceEndpoint = isInferenceEndpoint;
    this.#traceId = traceId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#timeout = timeout;
    this.model = model;
    this.temperature = temperature;
    this.telemetryMetadata = telemetryMetadata;
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

  /**
   * Invokes the connector and returns the model's response as a string.
   *
   * DEBUGGING RESPONSE ISSUES WITH ATTACK DISCOVERY:
   * When something between Kibana and the model alters or replaces the model's JSON with a non-JSON
   * body (for example an HTML error page or a truncated body), Attack Discovery generation fails. This
   * method is the single connector-agnostic choke point that sees BOTH sides of the exchange for every
   * connector type Attack Discovery uses (`.gen-ai`, `.inference`/EIS, `.bedrock`, `.gemini`), so the
   * `debug` logs below are the place to enable when diagnosing what the model actually received/returned:
   *   - the request payload (`assistantMessage`: the prompt + anonymized alerts sent to the model), and
   *   - the raw response on success, or the upstream error body (`serviceMessage`) on failure — whose
   *     shape is the biggest clue to the cause (an HTML page vs. a structured error vs. truncated JSON).
   *
   * These logs are gated only by the `Logger` passed into this class (no separate flag), so enable:
   *   - Attack Discovery 2.0 (workflows enabled): `plugins.discoveries` at `debug`
   *   - legacy elastic_assistant graph path:       `plugins.elasticAssistant` at `debug`
   * Correlate the request/response/error lines for a single call using the shared `traceId`.
   * Note: this replaces the older `.gen-ai`-only recipe that also required `plugins.actions` at `debug`
   * (that path only dumped the response body for OpenAI, never for EIS).
   */
  async _call(prompt: string): Promise<string> {
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);
    // request payload sent to the model: the exact content (prompt + anonymized alerts) that can be
    // altered before it reaches the model:
    this.#logger.debug(
      () =>
        `ActionsClientLlm#_call\ntraceId: ${this.#traceId}\nassistantMessage:\n${JSON.stringify(
          assistantMessage
        )} `
    );

    if (this.#isInferenceEndpoint) {
      if (!this.#inferenceClient) {
        throw new Error(
          `${LLM_TYPE}: inferenceClient is required when isInferenceEndpoint is true`
        );
      }

      try {
        const result = await this.#inferenceClient.chatComplete({
          connectorId: this.#connectorId,
          messages: [{ role: MessageRole.User, content: prompt }],
          temperature: this.temperature,
          modelName: this.model,
          timeout: this.#timeout,
        });

        // raw response for .inference/EIS connectors (via the inference client's chatComplete):
        this.#logger.debug(
          () =>
            `${LLM_TYPE}#_call response\ntraceId: ${this.#traceId}\nresponse:\n${result.content}`
        );

        return result.content;
      } catch (error) {
        // .inference/EIS failure: the thrown message carries the upstream error body. This is the ONLY
        // place that body is surfaced for EIS — the sub-action framework's response-schema dump does
        // not apply here because this path bypasses SubActionConnector.request():
        this.#logger.debug(
          () =>
            `${LLM_TYPE}#_call error\ntraceId: ${this.#traceId}\nerror:\n${
              error instanceof Error ? error.message : String(error)
            }`
        );

        throw error;
      }
    }

    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params:
        this.llmType === 'inference'
          ? {
              subAction: 'unified_completion',
              subActionParams: {
                body: {
                  model: this.model,
                  messages: [assistantMessage], // the assistant message
                },
                telemetryMetadata: this.telemetryMetadata,
              },
            }
          : {
              // hard code to non-streaming subaction as this class only supports non-streaming
              subAction: 'invokeAI',
              subActionParams: {
                model: this.model,
                messages: [assistantMessage], // the assistant message
                ...getDefaultArguments(this.llmType, this.temperature),
                // This timeout is large because LangChain prompts can be complicated and take a long time
                timeout: this.#timeout ?? DEFAULT_TIMEOUT,
                telemetryMetadata: this.telemetryMetadata,
              },
            },
    };

    const actionResult = await this.#actionsClient.execute(requestBody);
    if (actionResult.status === 'error') {
      // connector-level failure (e.g. .gen-ai/.bedrock/.gemini): `serviceMessage` carries the upstream
      // error — this is where a "Response validation failed (expected object, received string)" or a
      // non-JSON body surfaces:
      this.#logger.debug(
        () =>
          `${LLM_TYPE}#_call error\ntraceId: ${this.#traceId}\nmessage: ${
            actionResult?.message
          }\nserviceMessage: ${actionResult?.serviceMessage}`
      );

      const error = new Error(
        `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
      if (actionResult?.serviceMessage) {
        error.name = actionResult?.serviceMessage;
      }
      throw error;
    }

    if (this.llmType === 'inference') {
      const content = get('data.choices[0].message.content', actionResult);

      if (typeof content !== 'string') {
        throw new Error(
          `${LLM_TYPE}: inference content should be a string, but it had an unexpected type: ${typeof content}`
        );
      }

      // raw response for `inference` llmType (unified_completion sub-action):
      this.#logger.debug(
        () => `${LLM_TYPE}#_call response\ntraceId: ${this.#traceId}\nresponse:\n${content}`
      );

      return content; // per the contact of _call, return a string
    }

    const content = get('data.message', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }

    // raw response for invokeAI connectors (.gen-ai/.bedrock/.gemini): when a successful (200) but
    // non-JSON body is returned, it can arrive here as a string and this is what downstream JSON
    // parsing will fail on:
    this.#logger.debug(
      () => `${LLM_TYPE}#_call response\ntraceId: ${this.#traceId}\nresponse:\n${content}`
    );

    return content; // per the contact of _call, return a string
  }
}
