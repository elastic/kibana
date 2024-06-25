/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BedrockChat as _BedrockChat,
  convertMessagesToPromptAnthropic,
} from '@langchain/community/chat_models/bedrock/web';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core/server';
import { BaseBedrockInput, BedrockLLMInputOutputAdapter } from './utils/bedrock';

export class ActionsClientBedrockChatModel extends _BedrockChat {
  // Kibana variables
  #actions: ActionsPluginStart;
  #connectorId: string;
  #logger: Logger;
  #request: KibanaRequest;

  constructor({
    actions,
    request,
    connectorId,
    logger,
    ...params
  }: {
    actions: ActionsPluginStart;
    connectorId: string;
    logger: Logger;
    request: KibanaRequest;
  } & Partial<BaseBedrockInput> &
    BaseChatModelParams) {
    // Just to make Langchain BedrockChat happy
    super({
      ...params,
      credentials: { accessKeyId: '', secretAccessKey: '' },
    });

    this.#actions = actions;
    this.#request = request;
    this.#connectorId = connectorId;
    this.#logger = logger;
  }

  async _signedFetch(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    fields: {
      bedrockMethod: 'invoke' | 'invoke-with-response-stream';
      endpointHost: string;
      provider: string;
    }
  ) {
    const { bedrockMethod, endpointHost, provider } = fields;
    const {
      max_tokens: maxTokens,
      temperature,
      stop,
      modelKwargs,
      guardrailConfig,
      tools,
    } = this.invocationParams(options);
    const inputBody = this.usesMessagesApi
      ? BedrockLLMInputOutputAdapter.prepareMessagesInput(
          provider,
          messages,
          maxTokens,
          temperature,
          stop,
          modelKwargs,
          guardrailConfig,
          tools,
          this.#logger
        )
      : BedrockLLMInputOutputAdapter.prepareInput(
          provider,
          convertMessagesToPromptAnthropic(messages),
          maxTokens,
          temperature,
          stop,
          modelKwargs,
          fields.bedrockMethod,
          guardrailConfig
        );

    // create an actions client from the authenticated request context:
    const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

    const data = (await actionsClient.execute({
      actionId: this.#connectorId,
      params: {
        subAction: 'invokeAIRaw',
        subActionParams: {
          bedrockMethod,
          model: this.model,
          endpointHost,
          anthropicVersion: inputBody.anthropicVersion,
          messages: inputBody.messages,
          temperature: inputBody.temperature,
          stopSequences: inputBody.stopSequences,
          system: inputBody.system,
          maxTokens: inputBody.maxTokens,
          signal: options.signal,
          timeout: options.timeout,
        },
      },
    })) as unknown as Promise<Response>;

    if (bedrockMethod === 'invoke-with-response-stream') {
      return {
        body: data.data,
      };
    }

    return {
      ok: data.status === 'ok',
      json: () => data.data,
    };
  }
}
