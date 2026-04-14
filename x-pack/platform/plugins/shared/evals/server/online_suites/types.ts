/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { z } from '@kbn/zod';
import type { BoundInferenceClient, Model } from '@kbn/inference-common';
import type { EvalsExecutorClient } from '@kbn/evals-runner';

export interface OnlineSuiteLogger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

export interface OnlineSuiteRunContext<TSuiteParams = unknown> {
  runId: string;
  spaceId: string;
  suiteParams: TSuiteParams;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  inferenceClient: BoundInferenceClient;
  judgeInferenceClient: BoundInferenceClient;
  executorClient: EvalsExecutorClient;
  taskModel: Model;
  judgeModel: Model;
  logger: OnlineSuiteLogger;
  abortSignal: AbortSignal;
}

export interface OnlineSuiteDefinition<TSuiteParams = unknown> {
  id: string;
  name: string;
  description?: string;
  inputSchema: z.ZodType<TSuiteParams>;
  run: (ctx: OnlineSuiteRunContext<TSuiteParams>) => Promise<void>;
}

export interface OnlineSuiteListItem {
  id: string;
  name: string;
  description?: string;
}
