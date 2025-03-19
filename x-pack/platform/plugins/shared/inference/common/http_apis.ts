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
} from '@kbn/inference-common';

export type ChatCompleteRequestBody = {
  connectorId: string;
  system?: string;
  temperature?: number;
  modelName?: string;
  messages: Message[];
  functionCalling?: FunctionCallingMode;
  maxRetries?: number;
  retryConfiguration?: {
    retryOn?: 'all' | 'auto';
  };
} & ToolOptions;

export interface GetConnectorsResponseBody {
  connectors: InferenceConnector[];
}
