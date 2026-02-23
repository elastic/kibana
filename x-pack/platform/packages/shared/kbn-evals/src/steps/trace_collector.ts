/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { RanExperiment, EvalTraceCorrelation } from '../types';
import {
  createTracePreprocessor,
  validateTraceId,
  type PreprocessedTrace,
  type FetchTraceOptions,
  type TracePreprocessorConfig,
} from '../utils/improvement_suggestions/trace_preprocessor';

/**
 * Backend type for trace collection.
 * - 'elasticsearch': Fetch traces from Elasticsearch using ESQL queries
 * - 'phoenix': Fetch traces from Phoenix observability platform
 */
export type TraceCollectorBackend = 'elasticsearch' | 'phoenix';

/**
 * Status of a trace collector step execution.
 */
export type TraceCollectorStepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Configuration for creating a TraceCollectorStep.
 */
export interface TraceCollectorStepConfig {
  /** Logger instance */
  log: SomeDevLog;
  /** Backend to use for fetching traces */
  backend: TraceCollectorBackend;
  /** Elasticsearch client (required when backend is 'elasticsearch') */
  esClient?: EsClient;
  /** Index pattern for Elasticsearch traces (defaults to 'traces-*') */
  indexPattern?: string;
  /** Maximum spans per trace to fetch (defaults to 1000) */
  maxSpansPerTrace?: number;
  /** Retry count for trace fetching (defaults to 3) */
  retries?: number;
  /** Concurrency limit for parallel trace fetching (defaults to 5) */
  concurrency?: number;
  /** Whether to skip runs with missing or invalid trace IDs (defaults to true) */
  skipMissingTraces?: boolean;
  /** Metadata key where trace IDs are stored in run metadata (defaults to 'traceId') */
  traceIdMetadataKey?: string;
  /** Options for fetching trace data */
  fetchOptions?: FetchTraceOptions;
  /** Callback invoked when the step starts */
  onStart?: () => void;
  /** Callback invoked when the step completes */
  onComplete?: (result: TraceCollectorStepResult) => void;
  /** Callback invoked when a trace is successfully fetched */
  onTraceFetched?: (traceId: string, trace: PreprocessedTrace) => void;
  /** Callback invoked on error */
  onError?: (error: Error) => void;
}

/**
 * Input for executing the trace collector step.
 */
export interface TraceCollectorStepInput {
  /** The ran experiment with evaluation results */
  experiment: RanExperiment;
  /** Optional explicit map of run key to trace ID */
  traceIdMap?: Map<string, string>;
}

/**
 * Result of a trace collector step execution.
 */
export interface TraceCollectorStepResult {
  /** Execution status */
  status: TraceCollectorStepStatus;
  /** Correlations between evaluation runs and traces */
  correlations: EvalTraceCorrelation[];
  /** Count of traces successfully collected */
  successCount: number;
  /** Count of traces that failed to collect */
  failureCount: number;
  /** Count of runs skipped due to missing trace IDs */
  skippedCount: number;
  /** Warning messages from trace collection */
  warnings: string[];
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
 * TraceCollectorStep fetches trace data from configured backend (ES or Phoenix)
 * and correlates it with evaluation runs.
 *
 * This step provides a unified interface for collecting trace telemetry data
 * as part of an evaluation pipeline, handling:
 * - Trace ID extraction from experiment runs
 * - Parallel trace fetching with concurrency limits
 * - Correlation of traces with evaluation results
 * - Progress callbacks for monitoring
 * - Error handling and status reporting
 *
 * @example
 * ```typescript
 * const step = createTraceCollectorStep({
 *   log,
 *   backend: 'elasticsearch',
 *   esClient: elasticsearchClient,
 *   indexPattern: 'traces-apm-*',
 * });
 *
 * const result = await step.execute({
 *   experiment: ranExperiment,
 * });
 *
 * console.log(`Collected ${result.successCount} traces`);
 * ```
 */
export interface TraceCollectorStep {
  /** Execute the trace collector step */
  execute: (input: TraceCollectorStepInput) => Promise<TraceCollectorStepResult>;
  /** Get the backend type */
  getBackend: () => TraceCollectorBackend;
  /** Fetch a single trace by ID */
  fetchTrace: (traceId: string) => Promise<PreprocessedTrace>;
  /** Validate a trace ID */
  validateTraceId: (traceId: string) => boolean;
}

/**
 * Extracts trace ID from a run's metadata or evalThreadId.
 */
function extractTraceIdFromRun(
  run: RanExperiment['runs'][string],
  traceIdMetadataKey: string
): string | null {
  // First, check evalThreadId if it's a valid trace ID format
  if (run.evalThreadId && validateTraceId(run.evalThreadId)) {
    return run.evalThreadId;
  }

  // Check metadata for trace ID
  if (run.metadata && typeof run.metadata === 'object') {
    const metadataTraceId = (run.metadata as Record<string, unknown>)[traceIdMetadataKey];
    if (typeof metadataTraceId === 'string' && validateTraceId(metadataTraceId)) {
      return metadataTraceId;
    }
  }

  return null;
}

/**
 * Creates a TraceCollectorStep instance that fetches traces from the configured backend.
 *
 * @param config - Configuration for the trace collector step
 * @returns TraceCollectorStep instance
 */
export function createTraceCollectorStep(config: TraceCollectorStepConfig): TraceCollectorStep {
  const {
    log,
    backend,
    esClient,
    indexPattern = 'traces-*',
    maxSpansPerTrace = 1000,
    retries = 3,
    concurrency = 5,
    skipMissingTraces = true,
    traceIdMetadataKey = 'traceId',
    fetchOptions,
    onStart,
    onComplete,
    onTraceFetched,
    onError,
  } = config;

  // Validate configuration
  if (backend === 'elasticsearch' && !esClient) {
    throw new Error('Elasticsearch client is required when using elasticsearch backend');
  }

  // Create trace preprocessor for ES backend
  let tracePreprocessor: ReturnType<typeof createTracePreprocessor> | undefined;

  if (backend === 'elasticsearch' && esClient) {
    const preprocessorConfig: TracePreprocessorConfig = {
      esClient,
      indexPattern,
      maxSpans: maxSpansPerTrace,
      retries,
    };
    tracePreprocessor = createTracePreprocessor(preprocessorConfig);
  }

  /**
   * Fetches a single trace by ID.
   */
  async function fetchTrace(traceId: string): Promise<PreprocessedTrace> {
    if (!validateTraceId(traceId)) {
      throw new Error(`Invalid trace ID format: ${traceId}`);
    }

    if (backend === 'elasticsearch' && tracePreprocessor) {
      return tracePreprocessor.fetchTrace(traceId, fetchOptions);
    }

    if (backend === 'phoenix') {
      // Phoenix backend: traces are typically fetched via Phoenix API
      // For now, we'll return a minimal trace structure
      // In a full implementation, this would call the Phoenix traces API
      log.warning(
        'Phoenix trace fetching is not fully implemented. Returning minimal trace structure.'
      );
      return {
        traceId,
        rootOperation: null,
        spans: [],
        metrics: {
          totalDurationMs: 0,
          spanCount: 0,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
        errorSpans: [],
        llmSpans: [],
        toolSpans: [],
      };
    }

    throw new Error(`Unsupported backend: ${backend}`);
  }

  /**
   * Fetches multiple traces in parallel with concurrency limit.
   */
  async function fetchTraces(traceIds: string[]): Promise<Map<string, PreprocessedTrace | Error>> {
    const pLimit = (await import('p-limit')).default;
    const limiter = pLimit(concurrency);
    const results = new Map<string, PreprocessedTrace | Error>();

    await Promise.all(
      traceIds.map((traceId) =>
        limiter(async () => {
          try {
            const trace = await fetchTrace(traceId);
            results.set(traceId, trace);
            if (onTraceFetched) {
              onTraceFetched(traceId, trace);
            }
          } catch (error) {
            results.set(traceId, error instanceof Error ? error : new Error(String(error)));
          }
        })
      )
    );

    return results;
  }

  /**
   * Execute the trace collector step.
   */
  async function execute(input: TraceCollectorStepInput): Promise<TraceCollectorStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const warnings: string[] = [];
    const correlations: EvalTraceCorrelation[] = [];

    if (onStart) {
      onStart();
    }

    const { experiment, traceIdMap = new Map() } = input;
    const { runs, evaluationRuns } = experiment;

    log.info(
      `🔍 Starting trace collection for experiment "${experiment.id}" using ${backend} backend`
    );

    try {
      if (!runs || Object.keys(runs).length === 0) {
        log.warning('No runs found in experiment, skipping trace collection');
        const result: TraceCollectorStepResult = {
          status: 'completed',
          correlations: [],
          successCount: 0,
          failureCount: 0,
          skippedCount: 0,
          warnings: ['No runs found in experiment'],
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };

        if (onComplete) {
          onComplete(result);
        }

        return result;
      }

      // Collect trace IDs from runs
      const runTraceIds: Array<{
        runKey: string;
        traceId: string | null;
        run: RanExperiment['runs'][string];
      }> = [];

      for (const [runKey, runData] of Object.entries(runs)) {
        // First try to get trace ID from explicit map
        let traceId = traceIdMap.get(runKey) ?? null;

        // If not in map, extract from run data
        if (!traceId) {
          traceId = extractTraceIdFromRun(runData, traceIdMetadataKey);
        }

        // Check experiment metadata for trace ID mapping
        if (!traceId && experiment.experimentMetadata) {
          const metadataTraceIds = experiment.experimentMetadata[traceIdMetadataKey] as
            | Record<string, string>
            | undefined;
          if (metadataTraceIds && typeof metadataTraceIds === 'object') {
            traceId = metadataTraceIds[runKey] ?? null;
          }
        }

        runTraceIds.push({ runKey, traceId, run: runData });
      }

      // Identify unique valid trace IDs to fetch
      const validRunTraceIds = runTraceIds.filter(({ traceId }) => {
        if (!traceId) return false;
        if (!validateTraceId(traceId)) {
          warnings.push(`Invalid trace ID format: ${traceId}`);
          return false;
        }
        return true;
      });

      const skippedCount = runTraceIds.length - validRunTraceIds.length;
      if (skippedCount > 0) {
        log.info(`Skipping ${skippedCount} runs with missing or invalid trace IDs`);
      }

      const uniqueTraceIds = [...new Set(validRunTraceIds.map(({ traceId }) => traceId!))];

      log.info(
        `Fetching ${uniqueTraceIds.length} unique traces for ${validRunTraceIds.length} runs`
      );

      // Fetch traces
      const traceResults = await fetchTraces(uniqueTraceIds);

      // Build correlations
      let successCount = 0;
      let failureCount = 0;

      for (const { runKey, traceId, run } of runTraceIds) {
        // Gather evaluation results for this run
        const evalResults: Record<
          string,
          { score?: number | null; label?: string | null; explanation?: string }
        > = {};

        if (evaluationRuns) {
          evaluationRuns
            .filter((er) => er.runKey === runKey || er.exampleIndex === run.exampleIndex)
            .forEach((er) => {
              evalResults[er.name] = er.result || {};
            });
        }

        let trace: PreprocessedTrace | undefined;
        let traceError: string | undefined;

        if (traceId && validateTraceId(traceId)) {
          const traceResult = traceResults.get(traceId);

          if (traceResult instanceof Error) {
            failureCount++;
            traceError = traceResult.message;
            warnings.push(`Failed to fetch trace for run ${runKey}: ${traceError}`);
          } else if (traceResult) {
            successCount++;
            trace = traceResult;
          }
        }

        const correlation: EvalTraceCorrelation = {
          traceId: traceId || `synthetic-${runKey}`,
          exampleIndex: run.exampleIndex,
          repetition: run.repetition,
          runKey,
          input: run.input,
          expected: run.expected,
          output: run.output,
          evaluationResults: evalResults,
          trace,
          traceError,
        };

        correlations.push(correlation);
      }

      log.info(
        `✅ Trace collection completed: ${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped`
      );

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      const result: TraceCollectorStepResult = {
        status: 'completed',
        correlations,
        successCount,
        failureCount,
        skippedCount,
        warnings,
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

      log.error(`❌ Trace collection failed for experiment "${experiment.id}": ${err.message}`);

      if (onError) {
        onError(err);
      }

      const result: TraceCollectorStepResult = {
        status: 'failed',
        correlations,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        warnings,
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
    getBackend: () => backend,
    fetchTrace,
    validateTraceId,
  };
}

/**
 * Configuration for batch trace collection across multiple experiments.
 */
export interface BatchTraceCollectorStepConfig extends TraceCollectorStepConfig {
  /** Whether to run trace collection in parallel across experiments (default: true) */
  parallel?: boolean;
  /** Maximum parallel experiments when parallel is true (default: 3) */
  maxParallel?: number;
}

/**
 * Result from a batch trace collector execution.
 */
export interface BatchTraceCollectorStepResult {
  /** Overall status */
  status: TraceCollectorStepStatus;
  /** Results for each experiment */
  results: TraceCollectorStepResult[];
  /** Total traces successfully collected */
  totalSuccessCount: number;
  /** Total traces that failed to collect */
  totalFailureCount: number;
  /** Total runs skipped */
  totalSkippedCount: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Timestamp when the batch started */
  startedAt: string;
  /** Timestamp when the batch completed */
  completedAt: string;
}

/**
 * Creates a batch trace collector that can collect traces for multiple experiments.
 *
 * @param config - Configuration for the batch trace collector
 * @returns Batch execution function
 */
export function createBatchTraceCollectorStep(config: BatchTraceCollectorStepConfig) {
  const { parallel = true, maxParallel = 3, log, ...stepConfig } = config;

  const step = createTraceCollectorStep({ log, ...stepConfig });

  /**
   * Execute trace collection for multiple experiments in batch.
   */
  async function executeBatch(
    inputs: TraceCollectorStepInput[]
  ): Promise<BatchTraceCollectorStepResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const results: TraceCollectorStepResult[] = [];

    log.info(
      `🔍 Starting batch trace collection for ${inputs.length} experiments (parallel: ${parallel})`
    );

    if (parallel) {
      const pLimit = (await import('p-limit')).default;
      const limiter = pLimit(maxParallel);

      const promises = inputs.map((input, index) =>
        limiter(async () => {
          log.info(
            `📊 Collecting traces for experiment ${index + 1}/${inputs.length}: "${
              input.experiment.id
            }"`
          );
          return step.execute(input);
        })
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } else {
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        log.info(
          `📊 Collecting traces for experiment ${i + 1}/${inputs.length}: "${input.experiment.id}"`
        );
        const result = await step.execute(input);
        results.push(result);
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;

    const totalSuccessCount = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalFailureCount = results.reduce((sum, r) => sum + r.failureCount, 0);
    const totalSkippedCount = results.reduce((sum, r) => sum + r.skippedCount, 0);

    const overallStatus: TraceCollectorStepStatus = results.every((r) => r.status === 'completed')
      ? 'completed'
      : 'failed';

    log.info(
      `✅ Batch trace collection completed: ${totalSuccessCount} succeeded, ${totalFailureCount} failed, ${totalSkippedCount} skipped`
    );

    return {
      status: overallStatus,
      results,
      totalSuccessCount,
      totalFailureCount,
      totalSkippedCount,
      totalDurationMs,
      startedAt,
      completedAt,
    };
  }

  return {
    executeBatch,
    getStep: () => step,
    getBackend: () => step.getBackend(),
  };
}

/**
 * Type for the batch trace collector step instance.
 */
export type BatchTraceCollectorStep = ReturnType<typeof createBatchTraceCollectorStep>;
