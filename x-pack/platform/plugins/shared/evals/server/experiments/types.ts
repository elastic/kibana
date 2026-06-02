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
  /**
   * Suite-level default for the number of repetitions the UI should pre-fill
   * in the "Run now" form. The server will still fall back to {@link DEFAULT_SUITE_REPETITIONS}
   * if the caller omits the field entirely.
   */
  defaultRepetitions?: number;
}

export interface ExperimentSuiteListItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  default_repetitions?: number;
}

/**
 * Server-side fallback when neither the API caller nor the suite definition
 * specifies a value. Kept in one place so the UI seeded value, the workflow
 * step, and the `evals.runSuite` runner all agree.
 */
export const DEFAULT_SUITE_REPETITIONS = 3;
