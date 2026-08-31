/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import type { Model, ScoreMetadata } from '@kbn/evals-common';
import { EvaluationIndices } from '@kbn/evals-common';
import { types } from '@kbn/storage-adapter';

export const experimentsStorageSettings = {
  name: EvaluationIndices.EXPERIMENTS,
  schema: {
    properties: {
      experiment_id: types.keyword({}),
      name: types.keyword({}),
      description: types.text({}),
      status: types.keyword({}),
      started_at: types.date({}),
      completed_at: types.date({}),
      space_ids: types.keyword({}),
      protocol: types.object({ dynamic: false, properties: {} }),
      provenance: types.object({ dynamic: false, properties: {} }),
      completeness: types.object({
        properties: {
          successful_tasks: types.long({}),
          failed_tasks: types.long({}),
          score_ingest_failures: types.long({}),
        },
      }),
      error: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export type ExperimentRecordStatus = 'pending' | 'running' | 'completed' | 'failed';

export const isTerminalStatus = (status: ExperimentRecordStatus): boolean =>
  status === 'completed' || status === 'failed';

/**
 * The dataset as it was when the experiment ran. The live dataset may be
 * edited or deleted afterwards, so the record keeps what the run actually saw.
 */
export interface ExperimentDatasetSnapshot {
  id: string;
  name?: string;
  description?: string;
  examples_count?: number;
}

export interface ExperimentEvaluatorSnapshot {
  name: string;
  version?: string;
  kind?: 'llm' | 'code';
  model?: Model;
  configuration?: Record<string, unknown>;
}

/** How the experiment was set up: what ran, against what, judged by whom. */
export interface ExperimentProtocolSnapshot {
  dataset: ExperimentDatasetSnapshot;
  task?: {
    model?: Model;
    configuration?: Record<string, unknown>;
  };
  evaluators?: ExperimentEvaluatorSnapshot[];
  total_repetitions?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Where the run came from: CLI host, git state, CI build, or workflow
 * execution.
 */
export type ExperimentProvenance = Omit<ScoreMetadata, 'total_repetitions'>;

/** Counters reported at finalization; how much of the plan actually landed. */
export interface ExperimentCompleteness {
  successful_tasks?: number;
  failed_tasks?: number;
  score_ingest_failures?: number;
}

export interface ExperimentRecordStorageProperties {
  experiment_id: string;
  name: string;
  description?: string;
  protocol: ExperimentProtocolSnapshot;
  status: ExperimentRecordStatus;
  started_at?: string;
  completed_at?: string;
  provenance?: ExperimentProvenance;
  completeness?: ExperimentCompleteness;
  error?: string;
  space_ids?: string[];
  created_at: string;
  updated_at: string;
}
