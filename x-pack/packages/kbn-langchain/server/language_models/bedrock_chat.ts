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
import { PublicMethodsOf } from '@kbn/utility-types';

export const DEFAULT_BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
export const DEFAULT_BEDROCK_REGION = 'us-east-1';

export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
}

export class ActionsClientBedrockChatModel extends _BedrockChat {
  constructor({ actionsClient, connectorId, logger, ...params }: CustomChatModelInput) {
    super({
      ...params,
      credentials: { accessKeyId: '', secretAccessKey: '' },
      // only needed to force BedrockChat to use messages api for Claude v2
      model: params.model ?? DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
      fetchFn: async (url, options) => {
        const inputBody = JSON.parse(options?.body as string);

        if (this.streaming && !inputBody.tools?.length) {
          const data = (await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'invokeStream',
              subActionParams: {
                messages: inputBody.messages,
                temperature: params.temperature ?? inputBody.temperature,
                stopSequences: inputBody.stop_sequences,
                system: inputBody.system,
                maxTokens: params.maxTokens ?? inputBody.max_tokens,
                tools: inputBody.tools,
                anthropicVersion: inputBody.anthropic_version,
              },
            },
          })) as { data: Readable; status: string; message?: string; serviceMessage?: string };

          if (data.status === 'error') {
            throw new Error(
              `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
            );
          }

          return {
            body: Readable.toWeb(data.data),
          } as unknown as Response;
        }

        const data = (await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              messages: prepareMessages(inputBody.messages),
              temperature: params.temperature ?? inputBody.temperature,
              stopSequences: inputBody.stop_sequences,
              system: inputBody.system,
              maxTokens: params.maxTokens ?? inputBody.max_tokens,
              tools: inputBody.tools,
              anthropicVersion: inputBody.anthropic_version,
            },
          },
        })) as {
          status: string;
          data: { message: string };
          message?: string;
          serviceMessage?: string;
        };

        if (data.status === 'error') {
          throw new Error(
            `ActionsClientBedrockChat: action result status is error: ${data?.message} - ${data?.serviceMessage}`
          );
        }

        return {
          ok: data.status === 'ok',
          json: () => data.data,
        } as unknown as Response;
      },
    });
  }
}

const prepareMessages = (messages: Array<{ role: string; content: string[] }>) =>
  messages.reduce((acc, { role, content }) => {
    const lastMessage = acc[acc.length - 1];

    if (!lastMessage || lastMessage.role !== role) {
      acc.push({ role, content });
      return acc;
    }

    if (lastMessage.role === role) {
      acc[acc.length - 1].content = lastMessage.content.concat(content);
      return acc;
    }

    return acc;
  }, [] as Array<{ role: string; content: string[] }>);
