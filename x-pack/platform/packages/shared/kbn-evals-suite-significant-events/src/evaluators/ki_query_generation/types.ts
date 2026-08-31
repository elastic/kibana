/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import type { QueryAttempt, SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { ReasoningPromptDiagnostics } from '@kbn/inference-prompt-utils';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from '@kbn/streams-ai/src/significant_events/types';

export const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

export interface Query {
  esql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
  /** Eval-only: whether the query expects to match rows in the window. */
  expects_matches?: boolean;
}

/** Eval-only: a query attempt from add_queries, incl. rejected ones. Owned by `@kbn/streams-ai`. */
export type { QueryAttempt };

export interface KIQueryGenerationEvaluationExample {
  input: { sample_logs?: string[]; sample_docs?: Array<Record<string, unknown>> } & Record<
    string,
    unknown
  >;
  output: {
    expected_categories?: string[];
    expect_stats?: boolean;
    /** Eval-only deterministic outcome contract, e.g. expect_queries: false for an empty stream. */
    expect_queries?: boolean;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

interface KIQueryGenerationTaskOutput {
  queries: Query[];
  toolUsage?: SignificantEventsToolUsage;
  traceId?: string | null;
  /** Resolved KI source and grounding mode for this task's run. */
  ki_source?: 'canonical' | 'snapshot' | 'auto' | 'none';
  grounding_mode?: 'baseline' | 'grounded';
  /** Reasoning-loop diagnostics from the shared agent, for treatment verification. */
  reasoning_diagnostics?: ReasoningPromptDiagnostics;
  sample_logs?: string[];
  sample_docs?: Array<Record<string, unknown>>;
  query_attempts?: QueryAttempt[];
  evaluation_arm?: 'clean' | 'rerun';
}

export type KIQueryGenerationOutput = Query[] | KIQueryGenerationTaskOutput;

export const getQueriesFromOutput = (output: KIQueryGenerationOutput | undefined): Query[] => {
  if (!output) {
    return [];
  }
  return Array.isArray(output) ? output : output.queries ?? [];
};

export const getToolUsageFromOutput = (
  output: KIQueryGenerationOutput | undefined
): SignificantEventsToolUsage | undefined =>
  output && !Array.isArray(output) ? output.toolUsage : undefined;

/**
 * Reads the attempt diagnostics a task returns when `collectQueryAttempts` is on.
 * `undefined` means the task did not collect them, which is distinct from an empty run.
 */
export const getQueryAttempts = (output: unknown): QueryAttempt[] | undefined =>
  output &&
  typeof output === 'object' &&
  !Array.isArray(output) &&
  'query_attempts' in output &&
  Array.isArray((output as { query_attempts: unknown }).query_attempts)
    ? (output as { query_attempts: QueryAttempt[] }).query_attempts
    : undefined;

export type KIQueryGenerationEvaluator = Evaluator<
  KIQueryGenerationEvaluationExample,
  KIQueryGenerationOutput
>;

export interface ScenarioCriteriaConfig {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria?: EvaluationCriterion[];
}
