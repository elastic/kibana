/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RanExperiment,
  EvaluationResult,
  Example,
  TaskOutput,
  EvalsExecutorClient,
} from '../types';

/**
 * Represents a single collected result from an experiment run.
 */
export interface CollectedResult {
  /** Unique run key identifier */
  runKey: string;
  /** Index of the example in the dataset */
  exampleIndex: number;
  /** Repetition number for this run */
  repetition: number;
  /** Input provided to the task */
  input: Example['input'];
  /** Expected output (ground truth) */
  expected: Example['output'];
  /** Actual output from the task */
  output: TaskOutput;
  /** Metadata associated with the example */
  metadata: Example['metadata'];
  /** Evaluation results keyed by evaluator name */
  evaluationResults: Record<string, EvaluationResult>;
  /** Optional thread ID for correlation */
  evalThreadId?: string;
}

/**
 * Summary statistics for a single evaluator across all runs.
 */
export interface EvaluatorSummary {
  /** Evaluator name */
  name: string;
  /** Total number of evaluation runs */
  count: number;
  /** Mean score (if scores are numeric) */
  meanScore: number | null;
  /** Median score */
  medianScore: number | null;
  /** Minimum score */
  minScore: number | null;
  /** Maximum score */
  maxScore: number | null;
  /** Number of runs with passing scores (score >= 1) */
  passingCount: number;
  /** Number of runs with failing scores (score < 1) */
  failingCount: number;
  /** Number of runs with null/undefined scores */
  nullCount: number;
}

/**
 * Aggregated results for a single experiment.
 */
export interface ExperimentResults {
  /** Experiment ID */
  experimentId: string;
  /** Dataset ID */
  datasetId: string;
  /** Dataset name */
  datasetName: string;
  /** Dataset description */
  datasetDescription?: string;
  /** All collected results */
  results: CollectedResult[];
  /** Summary statistics by evaluator */
  evaluatorSummaries: Map<string, EvaluatorSummary>;
  /** Experiment metadata */
  metadata?: Record<string, unknown>;
  /** Total number of examples processed */
  totalExamples: number;
  /** Number of unique examples (without repetitions) */
  uniqueExamples: number;
  /** Number of repetitions per example */
  repetitions: number;
}

/**
 * Options for filtering collected results.
 */
export interface ResultFilterOptions {
  /** Filter by example index */
  exampleIndex?: number;
  /** Filter by repetition number */
  repetition?: number;
  /** Filter by evaluator name */
  evaluatorName?: string;
  /** Filter by minimum score */
  minScore?: number;
  /** Filter by maximum score */
  maxScore?: number;
  /** Filter by passing status (score >= 1) */
  passing?: boolean;
}

/**
 * Calculates the median of an array of numbers.
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Collects and organizes results from a RanExperiment object.
 *
 * @param experiment - The experiment to collect results from
 * @returns Aggregated experiment results with statistics
 */
export function collectExperimentResults(experiment: RanExperiment): ExperimentResults {
  const {
    id,
    datasetId,
    datasetName,
    datasetDescription,
    runs,
    evaluationRuns,
    experimentMetadata,
  } = experiment;

  const results: CollectedResult[] = [];
  const evaluatorScores = new Map<string, number[]>();

  // Process each run
  if (runs) {
    for (const [runKey, runData] of Object.entries(runs)) {
      // Collect evaluation results for this run
      const evalResults: Record<string, EvaluationResult> = {};

      if (evaluationRuns) {
        evaluationRuns
          .filter(
            (er) =>
              er.runKey === runKey ||
              (er.exampleIndex === runData.exampleIndex && er.repetition === runData.repetition)
          )
          .forEach((er) => {
            evalResults[er.name] = er.result || {};

            // Track scores for summary statistics
            const score = er.result?.score;
            if (!evaluatorScores.has(er.name)) {
              evaluatorScores.set(er.name, []);
            }
            if (typeof score === 'number' && !Number.isNaN(score)) {
              evaluatorScores.get(er.name)!.push(score);
            }
          });
      }

      results.push({
        runKey,
        exampleIndex: runData.exampleIndex,
        repetition: runData.repetition,
        input: runData.input,
        expected: runData.expected,
        output: runData.output,
        metadata: runData.metadata,
        evaluationResults: evalResults,
        evalThreadId: runData.evalThreadId,
      });
    }
  }

  // Calculate evaluator summaries
  const evaluatorSummaries = new Map<string, EvaluatorSummary>();

  if (evaluationRuns) {
    const evaluatorNames = new Set(evaluationRuns.map((er) => er.name));

    for (const name of evaluatorNames) {
      const evalRuns = evaluationRuns.filter((er) => er.name === name);
      const scores = evaluatorScores.get(name) || [];

      const passingCount = scores.filter((s) => s >= 1).length;
      const failingCount = scores.filter((s) => s < 1).length;
      const nullCount = evalRuns.length - scores.length;

      evaluatorSummaries.set(name, {
        name,
        count: evalRuns.length,
        meanScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
        medianScore: calculateMedian(scores),
        minScore: scores.length > 0 ? Math.min(...scores) : null,
        maxScore: scores.length > 0 ? Math.max(...scores) : null,
        passingCount,
        failingCount,
        nullCount,
      });
    }
  }

  // Calculate repetition count
  const exampleIndices = new Set(results.map((r) => r.exampleIndex));
  const uniqueExamples = exampleIndices.size;
  const repetitions = uniqueExamples > 0 ? Math.ceil(results.length / uniqueExamples) : 1;

  return {
    experimentId: id,
    datasetId,
    datasetName,
    datasetDescription,
    results,
    evaluatorSummaries,
    metadata: experimentMetadata,
    totalExamples: results.length,
    uniqueExamples,
    repetitions,
  };
}

/**
 * Filters collected results based on the provided options.
 *
 * @param results - The collected results to filter
 * @param options - Filter options
 * @returns Filtered results
 */
export function filterResults(
  results: CollectedResult[],
  options: ResultFilterOptions
): CollectedResult[] {
  return results.filter((result) => {
    if (options.exampleIndex !== undefined && result.exampleIndex !== options.exampleIndex) {
      return false;
    }

    if (options.repetition !== undefined && result.repetition !== options.repetition) {
      return false;
    }

    if (options.evaluatorName !== undefined) {
      const evalResult = result.evaluationResults[options.evaluatorName];
      if (!evalResult) return false;

      const score = evalResult.score;

      if (
        options.minScore !== undefined &&
        (score === null || score === undefined || score < options.minScore)
      ) {
        return false;
      }

      if (
        options.maxScore !== undefined &&
        (score === null || score === undefined || score > options.maxScore)
      ) {
        return false;
      }

      if (options.passing !== undefined) {
        const isPassing = typeof score === 'number' && score >= 1;
        if (options.passing !== isPassing) return false;
      }
    }

    return true;
  });
}

/**
 * Retrieves results for a specific example across all repetitions.
 *
 * @param experimentResults - The experiment results
 * @param exampleIndex - The example index to retrieve
 * @returns Results for the specified example
 */
export function getResultsByExample(
  experimentResults: ExperimentResults,
  exampleIndex: number
): CollectedResult[] {
  return experimentResults.results.filter((r) => r.exampleIndex === exampleIndex);
}

/**
 * Retrieves results for a specific repetition across all examples.
 *
 * @param experimentResults - The experiment results
 * @param repetition - The repetition number
 * @returns Results for the specified repetition
 */
export function getResultsByRepetition(
  experimentResults: ExperimentResults,
  repetition: number
): CollectedResult[] {
  return experimentResults.results.filter((r) => r.repetition === repetition);
}

/**
 * Retrieves all scores for a specific evaluator.
 *
 * @param experimentResults - The experiment results
 * @param evaluatorName - The evaluator name
 * @returns Array of scores (excluding null/undefined)
 */
export function getScoresByEvaluator(
  experimentResults: ExperimentResults,
  evaluatorName: string
): number[] {
  return experimentResults.results
    .map((r) => r.evaluationResults[evaluatorName]?.score)
    .filter((score): score is number => typeof score === 'number' && !Number.isNaN(score));
}

/**
 * Retrieves failing results (score < 1) for a specific evaluator.
 *
 * @param experimentResults - The experiment results
 * @param evaluatorName - The evaluator name
 * @returns Array of failing results with their scores
 */
export function getFailingResults(
  experimentResults: ExperimentResults,
  evaluatorName: string
): Array<{ result: CollectedResult; score: number }> {
  return experimentResults.results
    .map((r) => ({
      result: r,
      score: r.evaluationResults[evaluatorName]?.score,
    }))
    .filter(
      (item): item is { result: CollectedResult; score: number } =>
        typeof item.score === 'number' && item.score < 1
    );
}

/**
 * Retrieves passing results (score >= 1) for a specific evaluator.
 *
 * @param experimentResults - The experiment results
 * @param evaluatorName - The evaluator name
 * @returns Array of passing results with their scores
 */
export function getPassingResults(
  experimentResults: ExperimentResults,
  evaluatorName: string
): Array<{ result: CollectedResult; score: number }> {
  return experimentResults.results
    .map((r) => ({
      result: r,
      score: r.evaluationResults[evaluatorName]?.score,
    }))
    .filter(
      (item): item is { result: CollectedResult; score: number } =>
        typeof item.score === 'number' && item.score >= 1
    );
}

/**
 * Result collector that aggregates results from multiple experiments.
 */
export interface ResultCollector {
  /** Add an experiment to the collector */
  addExperiment: (experiment: RanExperiment) => ExperimentResults;
  /** Get all collected experiment results */
  getExperimentResults: () => ExperimentResults[];
  /** Get results for a specific experiment by ID */
  getExperimentById: (experimentId: string) => ExperimentResults | undefined;
  /** Get aggregated summary across all experiments */
  getAggregatedSummary: () => AggregatedSummary;
  /** Collect results from an executor client */
  collectFromClient: (client: EvalsExecutorClient) => Promise<ExperimentResults[]>;
  /** Clear all collected results */
  clear: () => void;
}

/**
 * Aggregated summary across multiple experiments.
 */
export interface AggregatedSummary {
  /** Total number of experiments */
  experimentCount: number;
  /** Total number of results across all experiments */
  totalResults: number;
  /** Aggregated evaluator summaries */
  evaluatorSummaries: Map<string, EvaluatorSummary>;
  /** Dataset names */
  datasetNames: string[];
}

/**
 * Creates a result collector for aggregating results from multiple experiments.
 *
 * @returns ResultCollector instance
 */
export function createResultCollector(): ResultCollector {
  const experimentResults: ExperimentResults[] = [];
  const experimentsById = new Map<string, ExperimentResults>();

  function addExperiment(experiment: RanExperiment): ExperimentResults {
    const results = collectExperimentResults(experiment);
    experimentResults.push(results);
    experimentsById.set(results.experimentId, results);
    return results;
  }

  function getExperimentResults(): ExperimentResults[] {
    return [...experimentResults];
  }

  function getExperimentById(experimentId: string): ExperimentResults | undefined {
    return experimentsById.get(experimentId);
  }

  function getAggregatedSummary(): AggregatedSummary {
    const aggregatedScores = new Map<string, number[]>();
    const aggregatedCounts = new Map<
      string,
      { total: number; passing: number; failing: number; null: number }
    >();

    // Aggregate scores from all experiments
    for (const expResults of experimentResults) {
      for (const [name, summary] of expResults.evaluatorSummaries) {
        if (!aggregatedCounts.has(name)) {
          aggregatedCounts.set(name, { total: 0, passing: 0, failing: 0, null: 0 });
          aggregatedScores.set(name, []);
        }

        const counts = aggregatedCounts.get(name)!;
        counts.total += summary.count;
        counts.passing += summary.passingCount;
        counts.failing += summary.failingCount;
        counts.null += summary.nullCount;

        // Get actual scores from results
        const scores = getScoresByEvaluator(expResults, name);
        aggregatedScores.get(name)!.push(...scores);
      }
    }

    // Build aggregated summaries
    const evaluatorSummaries = new Map<string, EvaluatorSummary>();
    for (const [name, counts] of aggregatedCounts) {
      const scores = aggregatedScores.get(name) || [];

      evaluatorSummaries.set(name, {
        name,
        count: counts.total,
        meanScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
        medianScore: calculateMedian(scores),
        minScore: scores.length > 0 ? Math.min(...scores) : null,
        maxScore: scores.length > 0 ? Math.max(...scores) : null,
        passingCount: counts.passing,
        failingCount: counts.failing,
        nullCount: counts.null,
      });
    }

    return {
      experimentCount: experimentResults.length,
      totalResults: experimentResults.reduce((sum, er) => sum + er.totalExamples, 0),
      evaluatorSummaries,
      datasetNames: experimentResults.map((er) => er.datasetName),
    };
  }

  async function collectFromClient(client: EvalsExecutorClient): Promise<ExperimentResults[]> {
    const experiments = await client.getRanExperiments();
    return experiments.map((exp) => addExperiment(exp));
  }

  function clear(): void {
    experimentResults.length = 0;
    experimentsById.clear();
  }

  return {
    addExperiment,
    getExperimentResults,
    getExperimentById,
    getAggregatedSummary,
    collectFromClient,
    clear,
  };
}
