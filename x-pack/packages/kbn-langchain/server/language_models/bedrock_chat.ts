/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BedrockChat as _BedrockChat } from '@langchain/community/chat_models/bedrock/web';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core/server';
import { Readable } from 'stream';

export const DEFAULT_BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
export const DEFAULT_BEDROCK_REGION = 'us-east-1';

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
  } & BaseChatModelParams) {
    // Just to make Langchain BedrockChat happy
    super({
      ...params,
      credentials: { accessKeyId: '', secretAccessKey: '' },
      usesMessagesApi: true,
      // only needed to force BedrockChat to use messages api for Claude v2
      model: DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
      fetchFn: async (url, options) => {
        // create an actions client from the authenticated request context:
        const actionsClient = await this.#actions.getActionsClientWithRequest(this.#request);

        const inputBody = JSON.parse(options?.body);

        if (this.streaming) {
          const data = await actionsClient.execute({
            actionId: this.#connectorId,
            params: {
              subAction: 'invokeStream',
              subActionParams: {
                // bedrockMethod: 'invoke-with-response-stream',
                model: this.model,
                // endpointHost: this.endpointHost,
                // anthropicVersion: inputBody.anthropicVersion,
                messages: inputBody.messages,
                temperature: inputBody.temperature,
                stopSequences: inputBody.stopSequences,
                system: inputBody.system,
                maxTokens: inputBody.maxTokens,
              },
            },
          });

          console.error('data', data);

          return {
            body: Readable.toWeb(data.data),
          };
        }

        const data = await actionsClient.execute({
          actionId: this.#connectorId,
          params: {
            subAction: 'invokeAI',
            subActionParams: {
              model: this.model,
              messages: inputBody.messages,
              temperature: inputBody.temperature,
              stopSequences: inputBody.stopSequences,
              system: inputBody.system,
              maxTokens: inputBody.maxTokens,
            },
          },
        });

        return {
          ok: data.status === 'ok',
          json: () => ({
            content: data.data.message,
            type: 'message',
          }),
        };
      },
    });

    this.#actions = actions;
    this.#request = request;
    this.#connectorId = connectorId;
    this.#logger = logger;
  }
}
