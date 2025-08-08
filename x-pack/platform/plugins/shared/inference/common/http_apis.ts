/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FunctionCallingMode,
  Message,
  ToolOptions,
  InferenceConnector,
  Prompt,
  ChatCompleteMetadata,
} from '@kbn/inference-common';

export interface ChatCompleteRequestBodyBase {
  connectorId: string;
  temperature?: number;
  modelName?: string;
  functionCalling?: FunctionCallingMode;
  maxRetries?: number;
  retryConfiguration?: {
    retryOn?: 'all' | 'auto';
  };
  metadata?: ChatCompleteMetadata;
}

export type ChatCompleteRequestBody = ChatCompleteRequestBodyBase & {
  system?: string;
  messages: Message[];
} & ToolOptions;

export type PromptRequestBody = ChatCompleteRequestBodyBase & {
  prompt: Omit<Prompt, 'input'>;
  prevMessages?: Message[];
  input?: unknown;
};

export interface GetConnectorsResponseBody {
  connectors: InferenceConnector[];
}
