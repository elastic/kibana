/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatBedrockConverse } from '@langchain/aws';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { Logger } from '@kbn/logging';
import { PublicMethodsOf } from '@kbn/utility-types';
import { BedrockRuntimeClient } from './bedrock_runtime_client';

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

export class ActionsClientChatBedrockConverse extends ChatBedrockConverse {
  constructor({ actionsClient, connectorId, logger, ...fields }: CustomChatModelInput) {
    super({
      ...(fields ?? {}),
      credentials: { accessKeyId: '', secretAccessKey: '' },
      // only needed to force BedrockChat to use messages api for Claude v2
      model: fields?.model ?? DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
    });
    Object.defineProperty(this, 'client', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0,
    });
    console.log('ActionsClientChatBedrockConversefields', fields);
    this.client = new BedrockRuntimeClient({
      actionsClient,
      connectorId,
      logger,
      model: fields?.model ?? DEFAULT_BEDROCK_MODEL,
      streaming: this.streaming,
      maxTokens: fields?.maxTokens,
      temperature: fields?.temperature,
    });
  }
}
