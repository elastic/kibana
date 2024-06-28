/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { LLM } from '@langchain/core/language_models/llms';
import { get } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TIMEOUT, getDefaultArguments } from './constants';

import { getMessageContentAndRole } from './helpers';
import { TraceOptions } from './types';

const LLM_TYPE = 'ActionsClientLlm';

interface ActionsClientLlmParams {
  actions: ActionsPluginStart;
  connectorId: string;
  llmType?: string;
  logger: Logger;
  request: KibanaRequest;
  model?: string;
  temperature?: number;
  timeout?: number;
  traceId?: string;
  traceOptions?: TraceOptions;
}

export class ActionsClientLlm extends LLM {
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest;
  #traceId: string;
  #timeout?: number;

  // Local `llmType` as it can change and needs to be accessed by abstract `_llmType()` method
  // Not using getter as `this._llmType()` is called in the constructor via `super({})`
  protected llmType: string;

  model?: string;
  temperature?: number;

  constructor({
    actions,
    connectorId,
    traceId = uuidv4(),
    llmType,
    logger,
    model,
    request,
    temperature,
    timeout,
    traceOptions,
  }: ActionsClientLlmParams) {
    super({
      callbacks: [...(traceOptions?.tracers ?? [])],
    });

    this.#actions = actions;
    this.#connectorId = connectorId;
    this.#traceId = traceId;
    this.llmType = llmType ?? LLM_TYPE;
    this.#logger = logger;
    this.#request = request;
    this.#timeout = timeout;
    this.model = model;
    this.temperature = temperature;
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

  async _call(prompt: string): Promise<string> {
    // convert the Langchain prompt to an assistant message:
    const assistantMessage = getMessageContentAndRole(prompt);
    this.#logger.debug(
      `ActionsClientLlm#_call\ntraceId: ${this.#traceId}\nassistantMessage:\n${JSON.stringify(
        assistantMessage
      )} `
    );
    // create a new connector request body with the assistant message:
    const requestBody = {
      actionId: this.#connectorId,
      params: {
        // hard code to non-streaming subaction as this class only supports non-streaming
        subAction: 'invokeAI',
        subActionParams: {
          model: this.model,
          messages: [assistantMessage], // the assistant message
          ...getDefaultArguments(this.llmType, this.temperature),
          // This timeout is large because LangChain prompts can be complicated and take a long time
          timeout: this.#timeout ?? DEFAULT_TIMEOUT,
        },
      },
    };

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const actionResult = await actionsClient.execute(requestBody);

    if (actionResult.status === 'error') {
      throw new Error(
        `${LLM_TYPE}: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
      );
    }

    const content = get('data.message', actionResult);

    if (typeof content !== 'string') {
      throw new Error(
        `${LLM_TYPE}: content should be a string, but it had an unexpected type: ${typeof content}`
      );
    }

    return content; // per the contact of _call, return a string
  }
}
