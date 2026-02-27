/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { OutputAPI } from '@kbn/inference-common';
import type {
  RanExperiment,
  ImprovementSuggestionAnalysisResult,
  ImprovementSuggestionCategory,
} from '../types';
import {
  createImprovementAnalyzer,
  type ImprovementAnalyzerConfig,
  type AnalyzeExperimentInput,
} from '../utils/improvement_analyzer';

/**
 * Status of an analysis step execution.
 */
export type AnalysisStepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Analysis method to use.
 * - 'auto': Use both LLM and heuristic analysis, combining results
 * - 'llm': Use only LLM-based analysis
 * - 'heuristic': Use only heuristic-based analysis
 */
export type AnalysisMethod = 'auto' | 'llm' | 'heuristic';

/**
 * Configuration for creating an AnalysisStep.
 */
export interface AnalysisStepConfig {
  /** Logger instance */
  log: SomeDevLog;
  /** Output API for LLM-based analysis (required for 'llm' and 'auto' methods) */
  output?: OutputAPI;
  /** Connector ID for the LLM (required for 'llm' and 'auto' methods) */
  connectorId?: string;
  /** Model identifier used for analysis */
  analyzerModel?: string;
  /** Analysis method to use (default: 'auto') */
  method?: AnalysisMethod;
  /** Enable heuristic-based analysis when using 'auto' method (default: true) */
  enableHeuristics?: boolean;
  /** Minimum score threshold to consider as low-performing (default: 0.7) */
  lowScoreThreshold?: number;
  /** Minimum number of low-scoring examples to generate a suggestion (default: 2) */
  minExamplesForSuggestion?: number;
  /** Maximum number of suggestions to generate (default: 10) */
  maxSuggestions?: number;
  /** Callback invoked when the step starts */
  onStart?: () => void;
  /** Callback invoked when the step completes */
  onComplete?: (result: AnalysisStepResult) => void;
  /** Callback invoked when analysis produces suggestions */
  onSuggestionsGenerated?: (result: ImprovementSuggestionAnalysisResult) => void;
  /** Callback invoked on error */
  onError?: (error: Error) => void;
}

/**
 * Input for executing the analysis step.
 */
export interface AnalysisStepInput {
  /** The experiment data to analyze */
  experiment: RanExperiment;
  /** Optional model identifier used in the evaluation */
  model?: string;
  /** Additional context to guide the analysis */
  additionalContext?: string;
  /** Specific categories to focus on */
  focusCategories?: ImprovementSuggestionCategory[];
}

/**
 * Result of an analysis step execution.
 */
export interface AnalysisStepResult {
  /** Execution status */
  status: AnalysisStepStatus;
  /** The improvement suggestion analysis result */
  analysisResult?: ImprovementSuggestionAnalysisResult;
  /** Count of suggestions generated */
  suggestionCount?: number;
  /** Count of high-impact suggestions */
  highImpactCount?: number;
  /** Error if the step failed */
  error?: Error;
  /** Timestamp when the step started */
  startedAt: string;
  /** Timestamp when the step completed */
  completedAt?: string;
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * AnalysisStep wraps the improvement analyzer to provide a step-based interface
 * for generating improvement suggestions from evaluation results.
 *
 * This step provides a unified interface for analyzing evaluation experiments
 * as part of a pipeline, handling:
 * - LLM-based and/or heuristic-based analysis
 * - Improvement suggestion generation
 * - Progress callbacks for monitoring
 * - Error handling and status reporting
 *
 * @example
 * ```typescript
 * const step = createAnalysisStep({
 *   log,
 *   output: inferenceClient.output,
 *   connectorId: 'my-connector',
 *   method: 'auto',
 * });
 *
 * const result = await step.execute({
 *   experiment: ranExperiment,
 *   model: 'gpt-4',
 * });
 *
 * console.log(`Generated ${result.suggestionCount} suggestions`);
 * ```
 */
export interface AnalysisStep {
  /** Execute the analysis step */
  execute: (input: AnalysisStepInput) => Promise<AnalysisStepResult>;
  /** Get the configured analysis method */
  getMethod: () => AnalysisMethod;
  /** Get the underlying improvement analyzer */
  getAnalyzer: () => ReturnType<typeof createImprovementAnalyzer>;
}

/**
 * Creates an AnalysisStep instance that wraps the improvement analyzer.
 *
 * @param config - Configuration for the analysis step
 * @returns AnalysisStep instance
 */
export function createAnalysisStep(config: AnalysisStepConfig): AnalysisStep {
  const {
    log,
    output,
    connectorId,
    analyzerModel,
    method = 'auto',
    enableHeuristics = true,
    lowScoreThreshold = 0.7,
    minExamplesForSuggestion = 2,
    maxSuggestions = 10,
    onStart,
    onComplete,
    onSuggestionsGenerated,
    onError,
  } = config;

  // Validate configuration based on method
  if ((method === 'llm' || method === 'auto') && (!output || !connectorId)) {
    if (method === 'llm') {
      throw new Error('LLM analysis requires output API and connectorId to be configured');
    }
    // For 'auto', we'll fall back to heuristic-only if LLM is not configured
    log.warning(
      'Output API or connectorId not configured, falling back to heuristic-only analysis'
    );
  }

  // Create the improvement analyzer
  const analyzerConfig: ImprovementAnalyzerConfig = {
    output,
    connectorId,
    analyzerModel,
    enableHeuristics: method === 'auto' ? enableHeuristics : method === 'heuristic',
    lowScoreThreshold,
    minExamplesForSuggestion,
    maxSuggestions,
  };

  const analyzer = createImprovementAnalyzer(analyzerConfig);

  /**
   * Execute the analysis step.
   */
  async function execute(input: AnalysisStepInput): Promise<AnalysisStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    if (onStart) {
      onStart();
    }

    const { experiment, model, additionalContext, focusCategories } = input;

    log.info(
      `🔬 Starting analysis step for experiment "${experiment.id}" using ${method} method`
    );

    try {
      const analyzeInput: AnalyzeExperimentInput = {
        experiment,
        model,
        additionalContext,
        focusCategories,
      };

      let analysisResult: ImprovementSuggestionAnalysisResult;

      // Execute analysis based on configured method
      switch (method) {
        case 'llm':
          analysisResult = await analyzer.analyzeLlm(analyzeInput);
          break;
        case 'heuristic':
          analysisResult = analyzer.analyzeHeuristic(analyzeInput);
          break;
        case 'auto':
        default:
          analysisResult = await analyzer.analyze(analyzeInput);
          break;
      }

      const suggestionCount = analysisResult.suggestions.length;
      const highImpactCount = analysisResult.suggestions.filter(
        (s) => s.impact === 'high'
      ).length;

      log.info(
        `✅ Analysis step completed for experiment "${experiment.id}": ${suggestionCount} suggestions generated (${highImpactCount} high-impact)`
      );

      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(analysisResult);
      }

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const result: AnalysisStepResult = {
        status: 'completed',
        analysisResult,
        suggestionCount,
        highImpactCount,
        startedAt,
        completedAt,
        durationMs,
      };

      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      log.error(`❌ Analysis step failed for experiment "${experiment.id}": ${err.message}`);

      if (onError) {
        onError(err);
      }

      const result: AnalysisStepResult = {
        status: 'failed',
        error: err,
        startedAt,
        completedAt,
        durationMs,
      };

      if (onComplete) {
        onComplete(result);
      }

      return result;
    }
  }

  return {
    execute,
    getMethod: () => method,
    getAnalyzer: () => analyzer,
  };
}

/**
 * Configuration for batch analysis across multiple experiments.
 */
export interface BatchAnalysisStepConfig extends AnalysisStepConfig {
  /** Whether to run analysis in parallel across experiments (default: true) */
  parallel?: boolean;
  /** Maximum parallel analyses when parallel is true (default: 3) */
  maxParallel?: number;
  /** Whether to merge results into a single combined result (default: false) */
  mergeResults?: boolean;
}

/**
 * Result from a batch analysis execution.
 */
export interface BatchAnalysisStepResult {
  /** Overall status */
  status: AnalysisStepStatus;
  /** Results for each experiment */
  results: AnalysisStepResult[];
  /** Merged analysis result (when mergeResults is true) */
  mergedResult?: ImprovementSuggestionAnalysisResult;
  /** Total suggestions generated across all experiments */
  totalSuggestionCount: number;
  /** Total high-impact suggestions across all experiments */
  totalHighImpactCount: number;
  /** Number of successful analyses */
  successCount: number;
  /** Number of failed analyses */
  failureCount: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Timestamp when the batch started */
  startedAt: string;
  /** Timestamp when the batch completed */
  completedAt: string;
}

/**
 * Creates a batch analysis step that can analyze multiple experiments.
 *
 * @param config - Configuration for the batch analysis step
 * @returns Batch execution function
 */
export function createBatchAnalysisStep(config: BatchAnalysisStepConfig) {
  const { parallel = true, maxParallel = 3, mergeResults = false, log, ...stepConfig } = config;

  const step = createAnalysisStep({ log, ...stepConfig });

  /**
   * Execute analysis for multiple experiments in batch.
   */
  async function executeBatch(inputs: AnalysisStepInput[]): Promise<BatchAnalysisStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const results: AnalysisStepResult[] = [];

    log.info(
      `🔬 Starting batch analysis for ${inputs.length} experiments (parallel: ${parallel})`
    );

    if (parallel) {
      const pLimit = (await import('p-limit')).default;
      const limiter = pLimit(maxParallel);

      const promises = inputs.map((input, index) =>
        limiter(async () => {
          log.info(
            `📊 Analyzing experiment ${index + 1}/${inputs.length}: "${input.experiment.id}"`
          );
          return step.execute(input);
        })
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } else {
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        log.info(`📊 Analyzing experiment ${i + 1}/${inputs.length}: "${input.experiment.id}"`);
        const result = await step.execute(input);
        results.push(result);
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === 'completed').length;
    const failureCount = results.filter((r) => r.status === 'failed').length;

    const totalSuggestionCount = results.reduce((sum, r) => sum + (r.suggestionCount || 0), 0);
    const totalHighImpactCount = results.reduce((sum, r) => sum + (r.highImpactCount || 0), 0);

    // Merge results if requested
    let mergedResult: ImprovementSuggestionAnalysisResult | undefined;
    if (mergeResults) {
      const successfulResults = results
        .filter((r) => r.status === 'completed' && r.analysisResult)
        .map((r) => r.analysisResult!);

      if (successfulResults.length > 0) {
        mergedResult = step.getAnalyzer().mergeResults(successfulResults);
      }
    }

    const overallStatus: AnalysisStepStatus =
      failureCount === 0 ? 'completed' : successCount > 0 ? 'completed' : 'failed';

    log.info(
      `✅ Batch analysis completed: ${successCount}/${inputs.length} succeeded, ${totalSuggestionCount} total suggestions (${totalHighImpactCount} high-impact)`
    );

    return {
      status: overallStatus,
      results,
      mergedResult,
      totalSuggestionCount,
      totalHighImpactCount,
      successCount,
      failureCount,
      totalDurationMs,
      startedAt,
      completedAt,
    };
  }

  return {
    executeBatch,
    getStep: () => step,
    getMethod: () => step.getMethod(),
    getAnalyzer: () => step.getAnalyzer(),
  };
}

/**
 * Type for the batch analysis step instance.
 */
export type BatchAnalysisStep = ReturnType<typeof createBatchAnalysisStep>;
