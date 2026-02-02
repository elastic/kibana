/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalTraceCorrelation, EvaluationResult } from '../types';
import type { PreprocessedTrace } from './improvement_suggestions/trace_preprocessor';

/**
 * Criteria for determining if an evaluation result is considered "failed".
 */
export interface FailureDetectionCriteria {
  /**
   * Minimum score threshold. Results with score below this are considered failed.
   * @default 0.5
   */
  scoreThreshold?: number;
  /**
   * Score comparison mode.
   * - 'below': score < threshold (default)
   * - 'belowOrEqual': score <= threshold
   * - 'zero': score === 0 or score === null
   */
  scoreComparison?: 'below' | 'belowOrEqual' | 'zero';
  /**
   * Labels that indicate failure (case-insensitive).
   * If any evaluation result has one of these labels, it's considered failed.
   * @default ['fail', 'failed', 'incorrect', 'error', 'wrong', 'no', 'false']
   */
  failureLabels?: string[];
  /**
   * Whether to include results where score is null or undefined.
   * @default false
   */
  treatNullScoreAsFailed?: boolean;
}

/**
 * Options for retrieving traces for failed evaluations.
 */
export interface GetFailedEvaluationTracesOptions {
  /**
   * Correlations to filter (from EvalTraceCorrelationService.correlateExperiment).
   */
  correlations: EvalTraceCorrelation[];
  /**
   * Specific evaluator names to check for failure.
   * If not provided, all evaluators are checked.
   */
  evaluatorNames?: string[];
  /**
   * Criteria for determining if an evaluation is failed.
   */
  failureCriteria?: FailureDetectionCriteria;
  /**
   * Whether to require all specified evaluators to fail (AND logic).
   * When false (default), any failing evaluator triggers inclusion (OR logic).
   * @default false
   */
  requireAllEvaluatorsFailed?: boolean;
  /**
   * Whether to include correlations that have trace errors.
   * @default true
   */
  includeTraceErrors?: boolean;
  /**
   * Maximum number of failed correlations to return.
   * Useful for limiting results when analyzing large datasets.
   */
  limit?: number;
}

/**
 * Information about why an evaluation was considered failed.
 */
export interface FailureReason {
  /**
   * Name of the evaluator that failed.
   */
  evaluatorName: string;
  /**
   * The actual score (if available).
   */
  score?: number | null;
  /**
   * The label (if available).
   */
  label?: string | null;
  /**
   * Explanation from the evaluator.
   */
  explanation?: string;
  /**
   * The failure criterion that was triggered.
   */
  criterion: 'score_below_threshold' | 'failure_label' | 'null_score' | 'zero_score';
}

/**
 * A correlation that was identified as failed.
 */
export interface FailedEvaluationCorrelation extends EvalTraceCorrelation {
  /**
   * Reasons why this correlation was considered failed.
   */
  failureReasons: FailureReason[];
  /**
   * Whether the trace itself had errors (separate from evaluation failure).
   */
  hasTraceError: boolean;
}

/**
 * Result of retrieving failed evaluation traces.
 */
export interface GetFailedEvaluationTracesResult {
  /**
   * Correlations identified as failed, with failure reasons.
   */
  failedCorrelations: FailedEvaluationCorrelation[];
  /**
   * Traces from failed correlations (excludes correlations with trace errors).
   */
  traces: PreprocessedTrace[];
  /**
   * Summary statistics.
   */
  summary: {
    /** Total correlations analyzed */
    totalCorrelations: number;
    /** Number of failed correlations */
    failedCount: number;
    /** Number of passed correlations */
    passedCount: number;
    /** Failure rate (failed / total) */
    failureRate: number;
    /** Number of correlations with trace fetch errors */
    traceErrorCount: number;
    /** Breakdown of failures by evaluator name */
    failuresByEvaluator: Record<string, number>;
    /** Breakdown of failures by criterion */
    failuresByCriterion: Record<string, number>;
  };
}

/**
 * Default failure labels (case-insensitive).
 */
const DEFAULT_FAILURE_LABELS = [
  'fail',
  'failed',
  'incorrect',
  'error',
  'wrong',
  'no',
  'false',
  'invalid',
  'bad',
];

/**
 * Default score threshold for failure detection.
 */
const DEFAULT_SCORE_THRESHOLD = 0.5;

/**
 * Checks if an evaluation result is considered failed based on the criteria.
 *
 * @param result - The evaluation result to check
 * @param criteria - The failure detection criteria
 * @returns Failure reason if failed, null if passed
 */
export function checkEvaluationFailure(
  result: EvaluationResult,
  criteria: FailureDetectionCriteria = {}
): Omit<FailureReason, 'evaluatorName'> | null {
  const {
    scoreThreshold = DEFAULT_SCORE_THRESHOLD,
    scoreComparison = 'below',
    failureLabels = DEFAULT_FAILURE_LABELS,
    treatNullScoreAsFailed = false,
  } = criteria;

  // Check for null/undefined score
  if (result.score === null || result.score === undefined) {
    if (treatNullScoreAsFailed) {
      return {
        score: result.score,
        label: result.label,
        explanation: result.explanation,
        criterion: 'null_score',
      };
    }
    // If score is null and we don't treat it as failed, check label
    if (result.label) {
      const normalizedLabel = result.label.toLowerCase().trim();
      if (failureLabels.some((fl) => normalizedLabel.includes(fl.toLowerCase()))) {
        return {
          score: result.score,
          label: result.label,
          explanation: result.explanation,
          criterion: 'failure_label',
        };
      }
    }
    return null;
  }

  // Check score-based criteria
  let scoreFailed = false;
  let criterion: FailureReason['criterion'] = 'score_below_threshold';

  switch (scoreComparison) {
    case 'zero':
      scoreFailed = result.score === 0;
      criterion = 'zero_score';
      break;
    case 'belowOrEqual':
      scoreFailed = result.score <= scoreThreshold;
      break;
    case 'below':
    default:
      scoreFailed = result.score < scoreThreshold;
      break;
  }

  if (scoreFailed) {
    return {
      score: result.score,
      label: result.label,
      explanation: result.explanation,
      criterion,
    };
  }

  // Check label-based criteria (even if score passed)
  if (result.label) {
    const normalizedLabel = result.label.toLowerCase().trim();
    if (failureLabels.some((fl) => normalizedLabel.includes(fl.toLowerCase()))) {
      return {
        score: result.score,
        label: result.label,
        explanation: result.explanation,
        criterion: 'failure_label',
      };
    }
  }

  return null;
}

/**
 * Retrieves traces for evaluations that are considered "failed" based on configurable criteria.
 *
 * This utility enables targeted debugging and analysis by filtering evaluation correlations
 * to only those that didn't meet success criteria, providing access to both the trace data
 * and detailed information about why each evaluation failed.
 *
 * @param options - Options for filtering and retrieving failed evaluation traces
 * @returns Failed correlations with traces and summary statistics
 *
 * @example
 * ```typescript
 * // Basic usage - get traces for all failed evaluations
 * const result = getFailedEvaluationTraces({
 *   correlations,
 * });
 *
 * console.log(`${result.summary.failedCount} evaluations failed`);
 * for (const failed of result.failedCorrelations) {
 *   console.log(`Run ${failed.runKey} failed:`, failed.failureReasons);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Check specific evaluators with custom threshold
 * const result = getFailedEvaluationTraces({
 *   correlations,
 *   evaluatorNames: ['correctness', 'groundedness'],
 *   failureCriteria: {
 *     scoreThreshold: 0.7,
 *     treatNullScoreAsFailed: true,
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Use AND logic - only include if all evaluators failed
 * const result = getFailedEvaluationTraces({
 *   correlations,
 *   evaluatorNames: ['correctness', 'relevance'],
 *   requireAllEvaluatorsFailed: true,
 * });
 * ```
 */
export function getFailedEvaluationTraces(
  options: GetFailedEvaluationTracesOptions
): GetFailedEvaluationTracesResult {
  const {
    correlations,
    evaluatorNames,
    failureCriteria = {},
    requireAllEvaluatorsFailed = false,
    includeTraceErrors = true,
    limit,
  } = options;

  const failedCorrelations: FailedEvaluationCorrelation[] = [];
  const traces: PreprocessedTrace[] = [];
  const failuresByEvaluator: Record<string, number> = {};
  const failuresByCriterion: Record<string, number> = {};
  let traceErrorCount = 0;

  for (const correlation of correlations) {
    // Track trace errors
    if (correlation.traceError) {
      traceErrorCount++;
      if (!includeTraceErrors) {
        continue;
      }
    }

    const failureReasons: FailureReason[] = [];

    // Get evaluators to check
    const evaluatorsToCheck = evaluatorNames
      ? evaluatorNames.filter((name) => name in correlation.evaluationResults)
      : Object.keys(correlation.evaluationResults);

    // Check each evaluator
    for (const evaluatorName of evaluatorsToCheck) {
      const result = correlation.evaluationResults[evaluatorName];
      if (!result) continue;

      const failure = checkEvaluationFailure(result, failureCriteria);
      if (failure) {
        failureReasons.push({
          evaluatorName,
          ...failure,
        });
      }
    }

    // Determine if this correlation should be included
    let shouldInclude = false;

    if (requireAllEvaluatorsFailed && evaluatorsToCheck.length > 0) {
      // AND logic: all checked evaluators must have failed
      shouldInclude = failureReasons.length === evaluatorsToCheck.length;
    } else {
      // OR logic: any evaluator failing triggers inclusion
      shouldInclude = failureReasons.length > 0;
    }

    // Special case: include correlations with trace errors if requested
    if (!shouldInclude && includeTraceErrors && correlation.traceError) {
      shouldInclude = true;
    }

    if (shouldInclude) {
      // Update statistics
      for (const reason of failureReasons) {
        failuresByEvaluator[reason.evaluatorName] =
          (failuresByEvaluator[reason.evaluatorName] || 0) + 1;
        failuresByCriterion[reason.criterion] = (failuresByCriterion[reason.criterion] || 0) + 1;
      }

      const failedCorrelation: FailedEvaluationCorrelation = {
        ...correlation,
        failureReasons,
        hasTraceError: !!correlation.traceError,
      };

      failedCorrelations.push(failedCorrelation);

      // Collect trace if available
      if (correlation.trace && !correlation.traceError) {
        traces.push(correlation.trace);
      }

      // Check limit
      if (limit && failedCorrelations.length >= limit) {
        break;
      }
    }
  }

  const totalCorrelations = correlations.length;
  const failedCount = failedCorrelations.length;
  const passedCount = totalCorrelations - failedCount;

  return {
    failedCorrelations,
    traces,
    summary: {
      totalCorrelations,
      failedCount,
      passedCount,
      failureRate: totalCorrelations > 0 ? failedCount / totalCorrelations : 0,
      traceErrorCount,
      failuresByEvaluator,
      failuresByCriterion,
    },
  };
}

/**
 * Retrieves trace IDs for failed evaluations without fetching full trace data.
 *
 * This is a lightweight alternative to `getFailedEvaluationTraces` when you only
 * need the trace IDs (e.g., to construct URLs to an external trace viewer).
 *
 * @param options - Same options as getFailedEvaluationTraces
 * @returns Array of trace IDs for failed evaluations
 *
 * @example
 * ```typescript
 * const failedTraceIds = getFailedEvaluationTraceIds({
 *   correlations,
 *   failureCriteria: { scoreThreshold: 0.7 },
 * });
 *
 * // Construct APM URLs
 * const apmUrls = failedTraceIds.map(
 *   (traceId) => `${apmBaseUrl}/traces?traceId=${traceId}`
 * );
 * ```
 */
export function getFailedEvaluationTraceIds(
  options: Omit<GetFailedEvaluationTracesOptions, 'includeTraceErrors'>
): string[] {
  const result = getFailedEvaluationTraces({
    ...options,
    includeTraceErrors: false,
  });

  return result.failedCorrelations.filter((c) => !c.traceError).map((c) => c.traceId);
}

/**
 * Groups failed correlations by evaluator name for analysis.
 *
 * @param failedCorrelations - Failed correlations from getFailedEvaluationTraces
 * @returns Map of evaluator name to correlations that failed on that evaluator
 *
 * @example
 * ```typescript
 * const result = getFailedEvaluationTraces({ correlations });
 * const byEvaluator = groupFailedCorrelationsByEvaluator(result.failedCorrelations);
 *
 * // Analyze failures for a specific evaluator
 * const correctnessFailures = byEvaluator.get('correctness') || [];
 * console.log(`Correctness had ${correctnessFailures.length} failures`);
 * ```
 */
export function groupFailedCorrelationsByEvaluator(
  failedCorrelations: FailedEvaluationCorrelation[]
): Map<string, FailedEvaluationCorrelation[]> {
  const grouped = new Map<string, FailedEvaluationCorrelation[]>();

  for (const correlation of failedCorrelations) {
    for (const reason of correlation.failureReasons) {
      const existing = grouped.get(reason.evaluatorName) || [];
      existing.push(correlation);
      grouped.set(reason.evaluatorName, existing);
    }
  }

  return grouped;
}

/**
 * Groups failed correlations by failure criterion for analysis.
 *
 * @param failedCorrelations - Failed correlations from getFailedEvaluationTraces
 * @returns Map of criterion to correlations that matched that criterion
 */
export function groupFailedCorrelationsByCriterion(
  failedCorrelations: FailedEvaluationCorrelation[]
): Map<FailureReason['criterion'], FailedEvaluationCorrelation[]> {
  const grouped = new Map<FailureReason['criterion'], FailedEvaluationCorrelation[]>();

  for (const correlation of failedCorrelations) {
    for (const reason of correlation.failureReasons) {
      const existing = grouped.get(reason.criterion) || [];
      existing.push(correlation);
      grouped.set(reason.criterion, existing);
    }
  }

  return grouped;
}

/**
 * Generates a human-readable summary of failed evaluations.
 *
 * @param result - Result from getFailedEvaluationTraces
 * @returns Formatted summary string
 */
export function formatFailedEvaluationsSummary(result: GetFailedEvaluationTracesResult): string {
  const { summary } = result;
  const lines: string[] = [];

  lines.push(`Failed Evaluations Summary`);
  lines.push(`${'='.repeat(50)}`);
  lines.push(`Total correlations: ${summary.totalCorrelations}`);
  lines.push(`Failed: ${summary.failedCount} (${(summary.failureRate * 100).toFixed(1)}%)`);
  lines.push(`Passed: ${summary.passedCount}`);

  if (summary.traceErrorCount > 0) {
    lines.push(`Trace errors: ${summary.traceErrorCount}`);
  }

  if (Object.keys(summary.failuresByEvaluator).length > 0) {
    lines.push('');
    lines.push('Failures by Evaluator:');
    for (const [evaluator, count] of Object.entries(summary.failuresByEvaluator).sort(
      (a, b) => b[1] - a[1]
    )) {
      lines.push(`  ${evaluator}: ${count}`);
    }
  }

  if (Object.keys(summary.failuresByCriterion).length > 0) {
    lines.push('');
    lines.push('Failures by Criterion:');
    for (const [criterion, count] of Object.entries(summary.failuresByCriterion).sort(
      (a, b) => b[1] - a[1]
    )) {
      lines.push(`  ${criterion}: ${count}`);
    }
  }

  return lines.join('\n');
}
