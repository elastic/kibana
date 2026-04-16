/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { z } from '@kbn/zod';
import type { BoundInferenceClient, Model } from '@kbn/inference-common';
import type { EvaluationDataset, EvalsExecutorClient } from '@kbn/evals-runner';

export interface ExperimentSuiteLogger {
  debug(message: string, meta?: object): void;
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
}

export interface ExperimentSuiteRunContext<TSuiteParams = unknown> {
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
  logger: ExperimentSuiteLogger;
  abortSignal: AbortSignal;
  getDatasetByName: (name: string) => Promise<EvaluationDataset | null>;
}

export interface ExperimentSuiteDefinition<TSuiteParams = unknown> {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  inputSchema: z.ZodType<TSuiteParams>;
  run: (ctx: ExperimentSuiteRunContext<TSuiteParams>) => Promise<void>;
}

export interface ExperimentSuiteListItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}
