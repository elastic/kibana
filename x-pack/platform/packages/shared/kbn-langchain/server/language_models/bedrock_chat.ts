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
import { PublicMethodsOf } from '@kbn/utility-types';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { prepareMessages, DEFAULT_BEDROCK_MODEL, DEFAULT_BEDROCK_REGION } from '../utils/bedrock';

export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  temperature?: number;
  signal?: AbortSignal;
  model?: string;
  maxTokens?: number;
  telemetryMetadata?: TelemetryMetadata;
}

/**
 * @deprecated Use the ActionsClientChatBedrockConverse chat model instead.
 * ActionsClientBedrockChatModel chat model supports non-streaming only the Bedrock Invoke API.
 * The LangChain team will support only the Bedrock Converse API in the future.
 */
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

        if (this.streaming) {
          throw new Error(
            `ActionsClientBedrockChat does not support streaming, use ActionsClientChatBedrockConverse instead`
          );
        }

        const data = (await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              telemetryMetadata: {
                pluginId: params?.telemetryMetadata?.pluginId,
                aggregateBy: params?.telemetryMetadata?.aggregateBy,
              },
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
