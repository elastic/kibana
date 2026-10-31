/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withEvaluatorSpan } from '@kbn/evals';
import type { DefaultEvaluators } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Long tool results (e.g. full documents fetched via `get_document_by_id`) can push a
 * single judge-analysis prompt past Kibana's HTTP payload limit (413 Payload Too Large)
 * and the judge's context window: the groundedness analysis serializes the entire step
 * history into its prompt. Strings above this length carry no additional grading signal.
 */
const MAX_ANALYSIS_STRING_LENGTH = 4000;

/** Raw step histories above this size would previously 413 the judge-analysis request. */
const OVERSIZED_STEPS_WARNING_BYTES = 500_000;

const truncateLongStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.length > MAX_ANALYSIS_STRING_LENGTH
      ? `${value.slice(0, MAX_ANALYSIS_STRING_LENGTH)}…[truncated for judge analysis]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map(truncateLongStrings);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, truncateLongStrings(entry)])
    );
  }
  return value;
};

export interface JudgeAnalysesResult {
  correctnessAnalysis?: Record<string, unknown>;
  groundednessAnalysis?: Record<string, unknown>;
  /** Non-empty when the analyses failed; appended to the task output's `errors`. */
  analysisErrors: Array<{ type: 'judge_analysis_failed'; message: string }>;
}

/**
 * Runs the correctness and groundedness analyses for a regression task with trimmed step
 * payloads, inside evaluator spans (root context) so the judge calls don't inflate the
 * task's own trace metrics.
 *
 * Never throws: `runExperiment` has no per-example catch, so a thrown analysis would
 * abort the whole experiment. On failure the analyses are omitted — the quantitative
 * judge evaluators then score null/'unavailable', which is excluded from aggregations —
 * and an error entry is returned for the task output's `errors` (feeding the
 * min-valid-sample / errored-example gates).
 */
export const runJudgeAnalyses = async ({
  evaluators,
  input,
  expected,
  response,
  metadata,
  log,
}: {
  evaluators: DefaultEvaluators;
  input: Record<string, unknown>;
  expected: unknown;
  response: { messages: unknown; steps?: unknown[] };
  metadata: Record<string, unknown> | null;
  log: ToolingLog;
}): Promise<JudgeAnalysesResult> => {
  const trimmedResponse = {
    ...response,
    steps: truncateLongStrings(response.steps) as unknown[] | undefined,
  };
  const exampleId = String(metadata?.queryId ?? metadata?.sourceRow ?? 'unknown-example');
  const question = typeof input.question === 'string' ? input.question.slice(0, 120) : '';
  const rawStepsBytes = response.steps ? JSON.stringify(response.steps).length : 0;
  const trimmedStepsBytes = trimmedResponse.steps
    ? JSON.stringify(trimmedResponse.steps).length
    : 0;
  // Surface which examples carry oversized step histories (full documents in tool
  // results): these are the ones that would 413 the judge-analysis request without
  // truncation, and are candidates for being swapped out of the dataset.
  const sizeMessage =
    `[regression] judge-analysis payload for ${exampleId}: steps raw=${rawStepsBytes}B, ` +
    `trimmed=${trimmedStepsBytes}B — "${question}"`;
  if (rawStepsBytes > OVERSIZED_STEPS_WARNING_BYTES) {
    log.warning(`${sizeMessage} (raw steps exceed ${OVERSIZED_STEPS_WARNING_BYTES}B)`);
  } else {
    log.debug(sizeMessage);
  }
  try {
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected,
          output: trimmedResponse,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected,
          output: trimmedResponse,
          metadata,
        })
      ),
    ]);
    return {
      correctnessAnalysis: correctnessResult?.metadata ?? undefined,
      groundednessAnalysis: groundednessResult?.metadata ?? undefined,
      analysisErrors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(
      `[regression] judge analyses failed for ${exampleId} ("${question}"), scoring null: ${message}`
    );
    return {
      analysisErrors: [{ type: 'judge_analysis_failed', message }],
    };
  }
};
