/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildkiteMetadata } from '@kbn/evals-common';

/**
 * A single example (row) of a dataset that a task is executed against. This is a
 * runtime-friendly, server-safe shape that mirrors the persisted dataset example
 * without the Playwright/Scout coupling of the `@kbn/evals` SDK types.
 */
export interface RunnerExample {
  id: string;
  index: number;
  input?: Record<string, unknown>;
  /** Expected output / ground truth, when available (offline evaluation). */
  output?: unknown;
  metadata?: Record<string, unknown> | null;
}

/** The result of executing a task against a single example. */
export interface TaskResult {
  output: Record<string, unknown>;
  /** OTel trace id that correlates the task execution with its evaluation. */
  traceId?: string;
}

/** A single named score produced by an evaluator. */
export interface EvaluatorScore {
  name: string;
  score?: number | null;
  label?: string | null;
  explanation?: string | null;
  metadata?: Record<string, unknown>;
  traceId?: string | null;
}

/**
 * The result of running one evaluator. A single evaluator can emit multiple
 * named scores (e.g. `correctness` -> factuality/relevance/sequence_accuracy),
 * mirroring the trace-based evaluator API contract.
 */
export interface EvaluatorResult {
  evaluator: {
    name: string;
    version?: string;
    kind?: 'llm' | 'code';
  };
  scores: EvaluatorScore[];
}

/** Metadata attached to every ingested score document. */
export interface ScoreDocumentMetadata {
  executionId?: string;
  suiteId?: string;
  totalRepetitions: number;
  hostname: string;
  git?: {
    branch?: string | null;
    commit_sha?: string | null;
  };
  ci?: BuildkiteMetadata;
}
