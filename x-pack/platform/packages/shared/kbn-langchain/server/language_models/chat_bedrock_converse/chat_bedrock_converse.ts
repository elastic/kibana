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
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { BedrockRuntimeClient } from './bedrock_runtime_client';
import { DEFAULT_BEDROCK_MODEL, DEFAULT_BEDROCK_REGION } from '../../utils/bedrock';

export interface CustomChatModelInput extends BaseChatModelParams {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  logger: Logger;
  signal?: AbortSignal;
  model?: string;
  telemetryMetadata?: TelemetryMetadata;
}

/**
 * Custom chat model class for Bedrock Converse API.
 * The ActionsClientChatBedrockConverse chat model supports streaming and
 * non-streaming via the Bedrock Converse and ConverseStream APIs.
 *
 * @param {Object} params - The parameters for the chat model.
 * @param {ActionsClient} params.actionsClient - The actions client.
 * @param {string} params.connectorId - The connector ID.
 * @param {Logger} params.logger - The logger instance.
 * @param {AbortSignal} [params.signal] - Optional abort signal.
 * @param {string} [params.model] - Optional model name.
 */
export class ActionsClientChatBedrockConverse extends ChatBedrockConverse {
  constructor({ actionsClient, connectorId, logger, ...fields }: CustomChatModelInput) {
    super({
      ...(fields ?? {}),
      credentials: { accessKeyId: '', secretAccessKey: '' },
      model: fields?.model ?? DEFAULT_BEDROCK_MODEL,
      region: DEFAULT_BEDROCK_REGION,
    });
    this.client = new BedrockRuntimeClient({
      actionsClient,
      connectorId,
      streaming: this.streaming,
      region: DEFAULT_BEDROCK_REGION,
      telemetryMetadata: fields?.telemetryMetadata,
    });
  }
}
