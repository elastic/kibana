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
import { Readable } from 'stream';
import { filter, isArray, map } from 'lodash';
import { PublicMethodsOf } from '@kbn/utility-types';

export const DEFAULT_BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
export const DEFAULT_BEDROCK_REGION = 'us-east-1';

export class ActionsClientBedrockChatModel extends _BedrockChat {
  constructor({
    actionsClient,
    connectorId,
    logger,
    ...params
  }: {
    actionsClient: PublicMethodsOf<ActionsClient>;
    connectorId: string;
    logger: Logger;
  } & BaseChatModelParams) {
    super({
      ...params,
      credentials: { accessKeyId: '', secretAccessKey: '' },
      // only needed to force BedrockChat to use messages api for Claude v2
      model: DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
      fetchFn: async (url, options) => {
        const inputBody = JSON.parse(options?.body as string);
        const messages = map(inputBody.messages, sanitizeMessage);

        if (this.streaming) {
          const data = (await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'invokeStream',
              subActionParams: {
                messages,
                temperature: inputBody.temperature,
                stopSequences: inputBody.stopSequences,
                system: inputBody.system,
                maxTokens: inputBody.maxTokens,
              },
            },
          })) as { data: Readable };

          return {
            body: Readable.toWeb(data.data),
          } as unknown as Response;
        }

        const data = (await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction: 'invokeAI',
            subActionParams: {
              messages,
              temperature: inputBody.temperature,
              stopSequences: inputBody.stopSequences,
              system: inputBody.system,
              maxTokens: inputBody.maxTokens,
            },
          },
        })) as { status: string; data: { message: string } };

        return {
          ok: data.status === 'ok',
          json: () => ({
            content: data.data.message,
            type: 'message',
          }),
        } as unknown as Response;
      },
    });
  }
}

const sanitizeMessage = ({
  role,
  content,
}: {
  role: string;
  content: string | Array<{ type: string; text: string }>;
}) => {
  if (isArray(content)) {
    const textContent = filter(content, ['type', 'text']);
    return { role, content: textContent[textContent.length - 1]?.text };
  }

  return {
    role,
    content,
  };
};
