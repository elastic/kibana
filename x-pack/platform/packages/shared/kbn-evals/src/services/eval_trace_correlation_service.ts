/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { RanExperiment, EvalTraceCorrelation, EvaluationResult } from '../types';
import {
  createTracePreprocessor,
  validateTraceId,
  type PreprocessedTrace,
  type TracePreprocessorConfig,
  type FetchTraceOptions,
} from '../utils/improvement_suggestions/trace_preprocessor';

/**
 * Configuration for the EvalTraceCorrelationService.
 */
export interface EvalTraceCorrelationServiceConfig {
  /** Elasticsearch client for querying traces */
  esClient: EsClient;
  /** Logger instance */
  log: SomeDevLog;
  /** Index pattern to query for traces (defaults to 'traces-*') */
  indexPattern?: string;
  /** Maximum spans per trace to fetch (defaults to 1000) */
  maxSpansPerTrace?: number;
  /** Retry count for trace fetching (defaults to 3) */
  retries?: number;
}

/**
 * Options for correlating an experiment with traces.
 */
export interface CorrelateExperimentOptions {
  /** The experiment to correlate */
  experiment: RanExperiment;
  /**
   * Map of run key to trace ID. Required when trace IDs are not stored
   * in the experiment metadata.
   */
  traceIdMap?: Map<string, string>;
  /**
   * Metadata key where trace IDs are stored in run metadata.
   * Defaults to 'traceId'.
   */
  traceIdMetadataKey?: string;
  /** Options for fetching trace data */
  fetchOptions?: FetchTraceOptions;
  /**
   * Whether to skip runs with missing or invalid trace IDs.
   * When false (default), throws an error.
   */
  skipMissingTraces?: boolean;
  /**
   * Whether to continue when trace fetching fails.
   * When true, the correlation will include an error message.
   */
  continueOnFetchError?: boolean;
}

/**
 * Result of correlating an experiment with traces.
 */
export interface CorrelateExperimentResult {
  /** Correlations successfully created */
  correlations: EvalTraceCorrelation[];
  /** Summary statistics */
  summary: {
    /** Total runs in the experiment */
    totalRuns: number;
    /** Runs successfully correlated with traces */
    correlatedRuns: number;
    /** Runs skipped due to missing trace IDs */
    skippedRuns: number;
    /** Runs with trace fetch errors */
    errorRuns: number;
    /** Total trace fetch time in milliseconds */
    fetchTimeMs: number;
  };
  /** Warnings encountered during correlation */
  warnings: string[];
}

/**
 * Options for batch correlating multiple experiments.
 */
export interface BatchCorrelateOptions {
  /** Experiments to correlate */
  experiments: RanExperiment[];
  /** Global trace ID map (keyed by experimentId:runKey) */
  traceIdMap?: Map<string, string>;
  /** Metadata key where trace IDs are stored */
  traceIdMetadataKey?: string;
  /** Options for fetching trace data */
  fetchOptions?: FetchTraceOptions;
  /** Whether to skip missing traces */
  skipMissingTraces?: boolean;
  /** Whether to continue on fetch errors */
  continueOnFetchError?: boolean;
}

/**
 * Result of batch correlating multiple experiments.
 */
export interface BatchCorrelateResult {
  /** Results keyed by experiment ID */
  results: Map<string, CorrelateExperimentResult>;
  /** Aggregate summary */
  summary: {
    totalExperiments: number;
    totalRuns: number;
    totalCorrelated: number;
    totalSkipped: number;
    totalErrors: number;
    totalFetchTimeMs: number;
  };
}

/**
 * Service for correlating evaluation runs with their corresponding trace data.
 *
 * This service enables linking evaluation results back to the underlying
 * OpenTelemetry trace telemetry, facilitating trace-based analysis and
 * debugging of evaluation outcomes.
 *
 * @example
 * ```typescript
 * const service = new EvalTraceCorrelationService({
 *   esClient,
 *   log,
 * });
 *
 * // Correlate with explicit trace ID map
 * const result = await service.correlateExperiment({
 *   experiment,
 *   traceIdMap: new Map([
 *     ['run-0-0', 'abc123...'],
 *     ['run-0-1', 'def456...'],
 *   ]),
 * });
 *
 * // Access correlated data
 * for (const correlation of result.correlations) {
 *   console.log(`Run ${correlation.runKey}: ${correlation.trace?.metrics.llmCallCount} LLM calls`);
 * }
 * ```
 */
export class EvalTraceCorrelationService {
  private readonly tracePreprocessor: ReturnType<typeof createTracePreprocessor>;
  private readonly log: SomeDevLog;

  constructor(config: EvalTraceCorrelationServiceConfig) {
    const { esClient, log, indexPattern, maxSpansPerTrace, retries } = config;

    this.log = log;

    const preprocessorConfig: TracePreprocessorConfig = {
      esClient,
      indexPattern,
      maxSpans: maxSpansPerTrace,
      retries,
    };

    this.tracePreprocessor = createTracePreprocessor(preprocessorConfig);
  }

  /**
   * Correlates a single experiment with its trace data.
   *
   * @param options - Correlation options
   * @returns Correlation result with linked traces and evaluation results
   */
  async correlateExperiment(
    options: CorrelateExperimentOptions
  ): Promise<CorrelateExperimentResult> {
    const {
      experiment,
      traceIdMap = new Map(),
      traceIdMetadataKey = 'traceId',
      fetchOptions,
      skipMissingTraces = false,
      continueOnFetchError = true,
    } = options;

    const startTime = Date.now();
    const correlations: EvalTraceCorrelation[] = [];
    const warnings: string[] = [];

    let skippedRuns = 0;
    let errorRuns = 0;

    const runEntries = Object.entries(experiment.runs);
    const totalRuns = runEntries.length;

    this.log.info(`Correlating ${totalRuns} runs from experiment ${experiment.id} with traces`);

    // Group evaluation runs by run key for efficient lookup
    const evaluationResultsByRunKey = this.groupEvaluationResultsByRunKey(experiment);

    // Collect trace IDs and validate
    const runTraceIds: Array<{
      runKey: string;
      traceId: string | null;
      run: (typeof runEntries)[number][1];
    }> = [];

    for (const [runKey, run] of runEntries) {
      // Try to get trace ID from map, then from run metadata
      let traceId = traceIdMap.get(runKey) ?? null;

      if (!traceId && run.evalThreadId) {
        // evalThreadId might be usable as a trace ID if it's a valid format
        if (validateTraceId(run.evalThreadId)) {
          traceId = run.evalThreadId;
        }
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

      if (!traceId) {
        if (skipMissingTraces) {
          skippedRuns++;
          warnings.push(`Skipped run ${runKey}: no trace ID found`);
          continue;
        } else {
          throw new Error(
            `No trace ID found for run ${runKey}. Provide trace IDs via traceIdMap or store them in experiment metadata.`
          );
        }
      }

      if (!validateTraceId(traceId)) {
        if (skipMissingTraces) {
          skippedRuns++;
          warnings.push(`Skipped run ${runKey}: invalid trace ID format: ${traceId}`);
          continue;
        } else {
          throw new Error(`Invalid trace ID format for run ${runKey}: ${traceId}`);
        }
      }

      runTraceIds.push({ runKey, traceId, run });
    }

    // Fetch traces - deduplicating trace IDs as multiple runs may share traces
    const uniqueTraceIds = [
      ...new Set(runTraceIds.map((r) => r.traceId).filter(Boolean)),
    ] as string[];

    this.log.info(`Fetching ${uniqueTraceIds.length} unique traces`);

    const traceResults = await this.tracePreprocessor.fetchTraces(uniqueTraceIds, fetchOptions);

    // Build correlations
    for (const { runKey, traceId, run } of runTraceIds) {
      if (!traceId) continue;

      const traceResult = traceResults.get(traceId);
      const evaluationResults = evaluationResultsByRunKey.get(runKey) ?? {};

      let trace: PreprocessedTrace | undefined;
      let traceError: string | undefined;

      if (traceResult instanceof Error) {
        errorRuns++;
        traceError = traceResult.message;
        warnings.push(`Failed to fetch trace for run ${runKey}: ${traceError}`);

        if (!continueOnFetchError) {
          throw new Error(`Failed to fetch trace for run ${runKey}: ${traceError}`);
        }
      } else if (traceResult) {
        trace = traceResult;
      }

      const correlation: EvalTraceCorrelation = {
        traceId,
        exampleIndex: run.exampleIndex,
        repetition: run.repetition,
        runKey,
        input: run.input,
        expected: run.expected,
        output: run.output,
        evaluationResults,
        trace,
        traceError,
      };

      correlations.push(correlation);
    }

    const fetchTimeMs = Date.now() - startTime;
    const correlatedRuns = correlations.filter((c) => c.trace && !c.traceError).length;

    this.log.info(
      `Correlation complete: ${correlatedRuns}/${totalRuns} runs correlated in ${fetchTimeMs}ms`
    );

    return {
      correlations,
      summary: {
        totalRuns,
        correlatedRuns,
        skippedRuns,
        errorRuns,
        fetchTimeMs,
      },
      warnings,
    };
  }

  /**
   * Correlates multiple experiments with their trace data in batch.
   *
   * @param options - Batch correlation options
   * @returns Batch correlation results
   */
  async batchCorrelate(options: BatchCorrelateOptions): Promise<BatchCorrelateResult> {
    const {
      experiments,
      traceIdMap = new Map(),
      traceIdMetadataKey,
      fetchOptions,
      skipMissingTraces,
      continueOnFetchError,
    } = options;

    const results = new Map<string, CorrelateExperimentResult>();
    let totalRuns = 0;
    let totalCorrelated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalFetchTimeMs = 0;

    for (const experiment of experiments) {
      // Extract trace IDs for this experiment from the global map
      const experimentTraceIdMap = new Map<string, string>();
      for (const [key, traceId] of traceIdMap) {
        if (key.startsWith(`${experiment.id}:`)) {
          const runKey = key.substring(experiment.id.length + 1);
          experimentTraceIdMap.set(runKey, traceId);
        }
      }

      const result = await this.correlateExperiment({
        experiment,
        traceIdMap: experimentTraceIdMap.size > 0 ? experimentTraceIdMap : undefined,
        traceIdMetadataKey,
        fetchOptions,
        skipMissingTraces,
        continueOnFetchError,
      });

      results.set(experiment.id, result);

      totalRuns += result.summary.totalRuns;
      totalCorrelated += result.summary.correlatedRuns;
      totalSkipped += result.summary.skippedRuns;
      totalErrors += result.summary.errorRuns;
      totalFetchTimeMs += result.summary.fetchTimeMs;
    }

    return {
      results,
      summary: {
        totalExperiments: experiments.length,
        totalRuns,
        totalCorrelated,
        totalSkipped,
        totalErrors,
        totalFetchTimeMs,
      },
    };
  }

  /**
   * Fetches a single trace by ID.
   *
   * @param traceId - The trace ID to fetch
   * @param options - Fetch options
   * @returns The preprocessed trace
   */
  async fetchTrace(traceId: string, options?: FetchTraceOptions): Promise<PreprocessedTrace> {
    if (!validateTraceId(traceId)) {
      throw new Error(`Invalid trace ID format: ${traceId}`);
    }

    return this.tracePreprocessor.fetchTrace(traceId, options);
  }

  /**
   * Fetches multiple traces by ID.
   *
   * @param traceIds - The trace IDs to fetch
   * @param options - Fetch options
   * @returns Map of trace ID to preprocessed trace or error
   */
  async fetchTraces(
    traceIds: string[],
    options?: FetchTraceOptions
  ): Promise<Map<string, PreprocessedTrace | Error>> {
    const validTraceIds = traceIds.filter((id) => {
      if (!validateTraceId(id)) {
        this.log.warning(`Skipping invalid trace ID: ${id}`);
        return false;
      }
      return true;
    });

    return this.tracePreprocessor.fetchTraces(validTraceIds, options);
  }

  /**
   * Validates whether a string is a valid trace ID format.
   *
   * @param traceId - The trace ID to validate
   * @returns True if valid
   */
  validateTraceId(traceId: string): boolean {
    return validateTraceId(traceId);
  }

  /**
   * Creates a trace ID map from experiment metadata.
   * Useful when trace IDs were stored during evaluation runs.
   *
   * @param experiment - The experiment to extract trace IDs from
   * @param metadataKey - The metadata key containing trace IDs
   * @returns Map of run key to trace ID
   */
  extractTraceIdsFromExperiment(
    experiment: RanExperiment,
    metadataKey: string = 'traceId'
  ): Map<string, string> {
    const traceIdMap = new Map<string, string>();

    // Check experiment-level metadata for a trace ID mapping
    if (experiment.experimentMetadata) {
      const metadataTraceIds = experiment.experimentMetadata[metadataKey];
      if (metadataTraceIds && typeof metadataTraceIds === 'object') {
        for (const [runKey, traceId] of Object.entries(metadataTraceIds)) {
          if (typeof traceId === 'string' && validateTraceId(traceId)) {
            traceIdMap.set(runKey, traceId);
          }
        }
      }
    }

    // Check individual run metadata
    for (const [runKey, run] of Object.entries(experiment.runs)) {
      if (traceIdMap.has(runKey)) continue;

      // Check evalThreadId
      if (run.evalThreadId && validateTraceId(run.evalThreadId)) {
        traceIdMap.set(runKey, run.evalThreadId);
        continue;
      }

      // Check run metadata if available
      if (run.metadata && typeof run.metadata === 'object') {
        const traceId = (run.metadata as Record<string, unknown>)[metadataKey];
        if (typeof traceId === 'string' && validateTraceId(traceId)) {
          traceIdMap.set(runKey, traceId);
        }
      }
    }

    return traceIdMap;
  }

  /**
   * Groups evaluation results by run key for efficient lookup.
   */
  private groupEvaluationResultsByRunKey(
    experiment: RanExperiment
  ): Map<string, Record<string, EvaluationResult>> {
    const resultsByRunKey = new Map<string, Record<string, EvaluationResult>>();

    for (const evalRun of experiment.evaluationRuns) {
      const runKey = evalRun.runKey;
      if (!runKey) continue;

      if (!resultsByRunKey.has(runKey)) {
        resultsByRunKey.set(runKey, {});
      }

      const results = resultsByRunKey.get(runKey)!;
      if (evalRun.result) {
        results[evalRun.name] = evalRun.result;
      }
    }

    return resultsByRunKey;
  }
}

/**
 * Creates an EvalTraceCorrelationService instance.
 *
 * @param config - Service configuration
 * @returns Configured service instance
 */
export function createEvalTraceCorrelationService(
  config: EvalTraceCorrelationServiceConfig
): EvalTraceCorrelationService {
  return new EvalTraceCorrelationService(config);
}
