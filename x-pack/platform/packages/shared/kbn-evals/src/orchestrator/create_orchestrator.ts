/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RanExperiment,
  EvalsExecutorClient,
  Evaluator,
  EvaluationDataset,
  ExperimentTask,
  Example,
  TaskOutput,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestion,
} from '../types';
import {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type ImprovementAnalyzer,
} from '../utils/improvement_analyzer';

/**
 * Configuration options for the feedback loop orchestrator.
 */
export interface FeedbackLoopOrchestratorConfig {
  /** Executor client for running experiments */
  executorClient: EvalsExecutorClient;
  /** Configuration for the improvement analyzer */
  analyzerConfig?: ImprovementAnalyzerConfig;
  /** Pre-configured improvement analyzer instance (takes precedence over analyzerConfig) */
  improvementAnalyzer?: ImprovementAnalyzer;
  /** Maximum number of iterations to run (default: 5) */
  maxIterations?: number;
  /** Minimum improvement threshold to continue iterations (default: 0.01) */
  minImprovementThreshold?: number;
  /** Callback invoked when an improvement is suggested */
  onSuggestion?: (suggestion: ImprovementSuggestion, iteration: number) => void;
  /** Callback invoked after each iteration completes */
  onIterationComplete?: (result: FeedbackLoopIterationResult) => void;
  /** Concurrency for running experiments (default: 1) */
  concurrency?: number;
}

/**
 * Input for starting a feedback loop.
 */
export interface FeedbackLoopInput<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> {
  /** The dataset to evaluate */
  dataset: EvaluationDataset<TExample>;
  /** The task function to evaluate */
  task: ExperimentTask<TExample, TTaskOutput>;
  /** Evaluators to use for evaluation */
  evaluators: Array<Evaluator<TExample, TTaskOutput>>;
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
  /** Optional model identifier */
  model?: string;
  /** Optional additional context for analysis */
  additionalContext?: string;
}

/**
 * Result of a single feedback loop iteration.
 */
export interface FeedbackLoopIterationResult {
  /** Iteration number (1-based) */
  iteration: number;
  /** The experiment run for this iteration */
  experiment: RanExperiment;
  /** Analysis results for this iteration */
  analysis: ImprovementSuggestionAnalysisResult;
  /** Mean score across all evaluators for this iteration */
  meanScore: number;
  /** Improvement from previous iteration (0 for first iteration) */
  improvementFromPrevious: number;
  /** Timestamp when the iteration started */
  startedAt: string;
  /** Timestamp when the iteration completed */
  completedAt: string;
  /** Duration of the iteration in milliseconds */
  durationMs: number;
}

/**
 * Result of a complete feedback loop run.
 */
export interface FeedbackLoopResult {
  /** All iterations that were run */
  iterations: FeedbackLoopIterationResult[];
  /** Total number of iterations completed */
  totalIterations: number;
  /** Initial mean score (from first iteration) */
  initialScore: number;
  /** Final mean score (from last iteration) */
  finalScore: number;
  /** Total improvement achieved */
  totalImprovement: number;
  /** All unique suggestions generated across iterations */
  allSuggestions: ImprovementSuggestion[];
  /** Reason the loop terminated */
  terminationReason: 'max_iterations' | 'no_improvement' | 'converged' | 'manual_stop';
  /** Total duration of all iterations in milliseconds */
  totalDurationMs: number;
}

/**
 * Controller for managing an active feedback loop.
 */
export interface FeedbackLoopController {
  /** Promise that resolves when the loop completes */
  result: Promise<FeedbackLoopResult>;
  /** Request the loop to stop after the current iteration */
  stop: () => void;
  /** Check if the loop has been requested to stop */
  isStopping: () => boolean;
}

/**
 * Creates a feedback loop orchestrator instance.
 * @param config - Configuration for the orchestrator
 * @returns Orchestrator functions
 */
export function createFeedbackLoopOrchestrator(config: FeedbackLoopOrchestratorConfig) {
  const {
    executorClient,
    analyzerConfig,
    maxIterations = 5,
    minImprovementThreshold = 0.01,
    onSuggestion,
    onIterationComplete,
    concurrency = 1,
  } = config;

  // Create or use provided improvement analyzer
  const improvementAnalyzer =
    config.improvementAnalyzer ?? createImprovementAnalyzer(analyzerConfig ?? {});

  /**
   * Calculates the mean score from an experiment's evaluation runs.
   */
  function calculateMeanScore(experiment: RanExperiment): number {
    const { evaluationRuns } = experiment;

    if (!evaluationRuns || evaluationRuns.length === 0) {
      return 0;
    }

    const scores = evaluationRuns
      .map((run) => run.result?.score)
      .filter((score): score is number => typeof score === 'number');

    if (scores.length === 0) {
      return 0;
    }

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Generates a unique iteration ID.
   */
  function generateIterationId(iteration: number): string {
    return `iteration-${iteration}-${Date.now().toString(36)}`;
  }

  /**
   * Runs a single iteration of the feedback loop.
   */
  async function runIteration<
    TExample extends Example = Example,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    input: FeedbackLoopInput<TExample, TTaskOutput>,
    iteration: number,
    previousScore: number
  ): Promise<FeedbackLoopIterationResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // Run the experiment
    const experiment = await executorClient.runExperiment(
      {
        dataset: input.dataset,
        task: input.task,
        metadata: {
          ...input.metadata,
          feedbackLoopIteration: iteration,
          iterationId: generateIterationId(iteration),
        },
        concurrency,
      },
      input.evaluators
    );

    // Analyze the results
    const analysis = await improvementAnalyzer.analyze({
      experiment,
      model: input.model,
      additionalContext: input.additionalContext,
    });

    // Calculate scores
    const meanScore = calculateMeanScore(experiment);
    const improvementFromPrevious = iteration > 1 ? meanScore - previousScore : 0;

    // Notify about suggestions
    if (onSuggestion) {
      for (const suggestion of analysis.suggestions) {
        onSuggestion(suggestion, iteration);
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const result: FeedbackLoopIterationResult = {
      iteration,
      experiment,
      analysis,
      meanScore,
      improvementFromPrevious,
      startedAt,
      completedAt,
      durationMs,
    };

    // Notify about iteration completion
    if (onIterationComplete) {
      onIterationComplete(result);
    }

    return result;
  }

  /**
   * Determines if the loop should continue based on improvement.
   */
  function shouldContinue(
    iterations: FeedbackLoopIterationResult[],
    stopRequested: boolean
  ): { continue: boolean; reason: FeedbackLoopResult['terminationReason'] } {
    if (stopRequested) {
      return { continue: false, reason: 'manual_stop' };
    }

    if (iterations.length >= maxIterations) {
      return { continue: false, reason: 'max_iterations' };
    }

    if (iterations.length < 2) {
      return { continue: true, reason: 'max_iterations' };
    }

    const lastIteration = iterations[iterations.length - 1];
    const improvement = lastIteration.improvementFromPrevious;

    if (improvement < 0) {
      return { continue: false, reason: 'no_improvement' };
    }

    if (improvement < minImprovementThreshold) {
      return { continue: false, reason: 'converged' };
    }

    return { continue: true, reason: 'max_iterations' };
  }

  /**
   * Collects unique suggestions from all iterations.
   */
  function collectUniqueSuggestions(
    iterations: FeedbackLoopIterationResult[]
  ): ImprovementSuggestion[] {
    const seenTitles = new Set<string>();
    const uniqueSuggestions: ImprovementSuggestion[] = [];

    for (const iteration of iterations) {
      for (const suggestion of iteration.analysis.suggestions) {
        const titleKey = suggestion.title.toLowerCase();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          uniqueSuggestions.push(suggestion);
        }
      }
    }

    return uniqueSuggestions.sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }

  /**
   * Builds the final result from all iterations.
   */
  function buildFinalResult(
    iterations: FeedbackLoopIterationResult[],
    terminationReason: FeedbackLoopResult['terminationReason']
  ): FeedbackLoopResult {
    const initialScore = iterations.length > 0 ? iterations[0].meanScore : 0;
    const finalScore = iterations.length > 0 ? iterations[iterations.length - 1].meanScore : 0;
    const totalImprovement = finalScore - initialScore;
    const totalDurationMs = iterations.reduce((sum, iter) => sum + iter.durationMs, 0);

    return {
      iterations,
      totalIterations: iterations.length,
      initialScore,
      finalScore,
      totalImprovement,
      allSuggestions: collectUniqueSuggestions(iterations),
      terminationReason,
      totalDurationMs,
    };
  }

  /**
   * Runs the complete feedback loop.
   * @param input - Input for the feedback loop
   * @returns Controller with result promise and stop function
   */
  function run<TExample extends Example = Example, TTaskOutput extends TaskOutput = TaskOutput>(
    input: FeedbackLoopInput<TExample, TTaskOutput>
  ): FeedbackLoopController {
    let stopRequested = false;
    const iterations: FeedbackLoopIterationResult[] = [];

    const stop = () => {
      stopRequested = true;
    };

    const isStopping = () => stopRequested;

    const result = (async (): Promise<FeedbackLoopResult> => {
      let previousScore = 0;
      let terminationReason: FeedbackLoopResult['terminationReason'] = 'max_iterations';

      for (let i = 1; i <= maxIterations; i++) {
        const iterationResult = await runIteration(input, i, previousScore);
        iterations.push(iterationResult);

        previousScore = iterationResult.meanScore;

        const { continue: shouldLoop, reason } = shouldContinue(iterations, stopRequested);
        terminationReason = reason;

        if (!shouldLoop) {
          break;
        }
      }

      return buildFinalResult(iterations, terminationReason);
    })();

    return {
      result,
      stop,
      isStopping,
    };
  }

  /**
   * Runs a single iteration without the full loop.
   * Useful for manual control over the feedback loop process.
   */
  async function runSingleIteration<
    TExample extends Example = Example,
    TTaskOutput extends TaskOutput = TaskOutput
  >(
    input: FeedbackLoopInput<TExample, TTaskOutput>,
    iteration: number = 1,
    previousScore: number = 0
  ): Promise<FeedbackLoopIterationResult> {
    return runIteration(input, iteration, previousScore);
  }

  /**
   * Analyzes an existing experiment without running a new one.
   */
  async function analyzeExperiment(
    experiment: RanExperiment,
    options?: { model?: string; additionalContext?: string }
  ): Promise<ImprovementSuggestionAnalysisResult> {
    return improvementAnalyzer.analyze({
      experiment,
      model: options?.model,
      additionalContext: options?.additionalContext,
    });
  }

  /**
   * Compares two iterations to understand improvement.
   */
  function compareIterations(
    before: FeedbackLoopIterationResult,
    after: FeedbackLoopIterationResult
  ): {
    scoreDelta: number;
    percentageChange: number;
    newSuggestions: ImprovementSuggestion[];
    resolvedSuggestions: ImprovementSuggestion[];
  } {
    const scoreDelta = after.meanScore - before.meanScore;
    const percentageChange =
      before.meanScore !== 0 ? (scoreDelta / before.meanScore) * 100 : scoreDelta > 0 ? 100 : 0;

    const beforeTitles = new Set(before.analysis.suggestions.map((s) => s.title.toLowerCase()));
    const afterTitles = new Set(after.analysis.suggestions.map((s) => s.title.toLowerCase()));

    const newSuggestions = after.analysis.suggestions.filter(
      (s) => !beforeTitles.has(s.title.toLowerCase())
    );
    const resolvedSuggestions = before.analysis.suggestions.filter(
      (s) => !afterTitles.has(s.title.toLowerCase())
    );

    return {
      scoreDelta,
      percentageChange,
      newSuggestions,
      resolvedSuggestions,
    };
  }

  /**
   * Gets the improvement analyzer instance for advanced usage.
   */
  function getAnalyzer(): ImprovementAnalyzer {
    return improvementAnalyzer;
  }

  return {
    run,
    runSingleIteration,
    analyzeExperiment,
    compareIterations,
    getAnalyzer,
    calculateMeanScore,
  };
}

/**
 * Type for the feedback loop orchestrator instance.
 */
export type FeedbackLoopOrchestrator = ReturnType<typeof createFeedbackLoopOrchestrator>;
