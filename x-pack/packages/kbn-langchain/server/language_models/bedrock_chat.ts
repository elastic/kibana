/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BedrockChat as _BedrockChat } from '@langchain/community/chat_models/bedrock/web';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { Logger } from '@kbn/logging';
// import { Readable } from 'stream';
import { PublicMethodsOf } from '@kbn/utility-types';

export const DEFAULT_BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
export const DEFAULT_BEDROCK_REGION = 'us-east-1';

export class ActionsClientBedrockChatModel extends _BedrockChat {
  constructor({
    actionsClient,
    connectorId,
    logger,
    graph,
    ...params
  }: {
    actionsClient: PublicMethodsOf<ActionsClient>;
    connectorId: string;
    logger: Logger;
    graph?: boolean;
  } & BaseChatModelParams) {
    super({
      ...params,
      credentials: { accessKeyId: '', secretAccessKey: '' },
      // only needed to force BedrockChat to use messages api for Claude v2
      model: DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
      fetchFn: async (url, options) => {
        const inputBody = JSON.parse(options?.body as string);

        // if (this.streaming && graph) {
        //   const data = (await actionsClient.execute({
        //     actionId: connectorId,
        //     params: {
        //       subAction: 'invokeStream',
        //       subActionParams: {
        //         messages: inputBody.messages,
        //         temperature: inputBody.temperature,
        //         stopSequences: inputBody.stopSequences,
        //         system: inputBody.system,
        //         maxTokens: inputBody.maxTokens,
        //         tools: inputBody.tools,
        //         anthropicVersion: inputBody.anthropic_version,
        //       },
        //     },
        //   })) as { data: Readable };

        //   return {
        //     body: Readable.toWeb(data.data),
        //     json: () => Readable.toWeb(data.data),
        //   } as unknown as Response;
        // }

        const data = (await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              messages: inputBody.messages,
              temperature: inputBody.temperature,
              stopSequences: inputBody.stopSequences,
              system: inputBody.system,
              maxTokens: inputBody.maxTokens,
              tools: inputBody.tools,
              anthropicVersion: inputBody.anthropic_version,
            },
          },
        })) as { status: string; data: { message: string } };

        return {
          ok: data.status === 'ok',
          json: () => data.data,
        } as unknown as Response;
      },
    });
  }
}
