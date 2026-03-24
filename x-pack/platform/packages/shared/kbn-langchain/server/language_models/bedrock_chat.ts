/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { ActionsClientChatBedrockConverse } from './chat_bedrock_converse/chat_bedrock_converse';

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
export class ActionsClientBedrockChatModel extends ActionsClientChatBedrockConverse {}
