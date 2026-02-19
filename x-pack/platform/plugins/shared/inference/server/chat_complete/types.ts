/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
  FunctionCallingMode,
  Message,
  ToolOptions,
  ChatCompleteMetadata,
  AnonymizationRule,
} from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginsStart } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceExecutor } from './utils';
import type { RegexWorkerService } from './anonymization/regex_worker_service';

/**
 * Adapter in charge of communicating with a specific inference connector
 * and to convert inputs/outputs from/to the common chatComplete inference format.
 *
 * @internal
 */
export interface InferenceConnectorAdapter {
  chatComplete: (
    options: InferenceAdapterChatCompleteOptions
  ) => Observable<InferenceConnectorAdapterChatCompleteEvent>;
}

/**
 * Options for {@link InferenceConnectorAdapter.chatComplete}
 *
 * @internal
 */
export type InferenceAdapterChatCompleteOptions = {
  executor: InferenceExecutor;
  messages: Message[];
  logger: Logger;
  system?: string;
  functionCalling?: FunctionCallingMode;
  temperature?: number;
  modelName?: string;
  abortSignal?: AbortSignal;
  metadata?: ChatCompleteMetadata;
  stream?: boolean;
  timeout?: number;
} & ToolOptions;

/**
 * Events that can be emitted by the observable returned from {@link InferenceConnectorAdapter.chatComplete}
 *
 * @internal
 */
export type InferenceConnectorAdapterChatCompleteEvent =
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent;

/**
 * Options for createChatCompleteApi
 */

export interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  actions: ActionsPluginsStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
}
