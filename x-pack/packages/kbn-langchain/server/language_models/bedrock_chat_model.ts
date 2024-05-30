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
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatResult, ChatGenerationChunk } from '@langchain/core/outputs';
import { PluginStartContract } from '@kbn/actions-plugin/server/plugin';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { BaseBedrockInput, BedrockLLMInputOutputAdapter } from './utils_bedrock';

export class BedrockChat extends _BedrockChat {
  actionsClient: Awaited<ReturnType<PluginStartContract['getActionsClientWithRequest']>>;
  connectorId: string;

  constructor({
    actionsClient,
    connectorId,
    ...params
  }: {
    actionsClient: Awaited<ReturnType<PluginStartContract['getActionsClientWithRequest']>>;
    connectorId: string;
  } & Partial<BaseBedrockInput> &
    BaseChatModelParams) {
    // Just to make Langchain BedrockChat happy
    super({ ...params, credentials: { accessKeyId: '', secretAccessKey: '' } });

    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const service = 'bedrock-runtime';
    const endpointHost = this.endpointHost ?? `${service}.${this.region}.amazonaws.com`;
    const provider = this.model.split('.')[0];
    if (this.streaming) {
      const stream = this._streamResponseChunks(messages, options, runManager);
      let finalResult: ChatGenerationChunk | undefined;
      for await (const chunk of stream) {
        if (finalResult === undefined) {
          finalResult = chunk;
        } else {
          finalResult = finalResult.concat(chunk);
        }
      }
      if (finalResult === undefined) {
        throw new Error('Could not parse final output from Bedrock streaming call.');
      }
      return {
        generations: [finalResult],
        llmOutput: finalResult.generationInfo,
      };
    }

    const response = await this._signedFetch(messages, options, {
      bedrockMethod: 'invoke',
      endpointHost,
      provider,
    });
    const json = await response.data.json();
    if (response.status !== 'ok') {
      throw new Error(`Error ${response.status}: ${json.message ?? JSON.stringify(json)}`);
    }
    if (this.usesMessagesApi) {
      const outputGeneration = BedrockLLMInputOutputAdapter.prepareMessagesOutput(provider, json);
      if (outputGeneration === undefined) {
        throw new Error('Failed to parse output generation.');
      }
      return {
        generations: [outputGeneration],
        llmOutput: outputGeneration.generationInfo,
      };
    } else {
      const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, json);
      return { generations: [{ text, message: new AIMessage(text) }] };
    }
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
    const inputBody = this.usesMessagesApi
      ? BedrockLLMInputOutputAdapter.prepareMessagesInput(
          provider,
          messages,
          this.maxTokens,
          this.temperature,
          options.stop ?? this.stopSequences,
          this.modelKwargs
        )
      : BedrockLLMInputOutputAdapter.prepareInput(
          provider,
          convertMessagesToPromptAnthropic(messages),
          this.maxTokens,
          this.temperature,
          options.stop ?? this.stopSequences,
          this.modelKwargs,
          fields.bedrockMethod
        );

    return this.actionsClient.execute({
      actionId: this.connectorId,
      params: {
        subAction: 'runApiRaw',
        subActionParams: {
          bedrockMethod,
          model: this.model,
          endpointHost,
          body: JSON.stringify(inputBody),
        },
      },
    }) as unknown as Promise<Response>;
  }
}
