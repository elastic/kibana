/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { isValidTraceId } from '@opentelemetry/api';
import pRetry from 'p-retry';
import type { SummarizePromptInput } from './prompts/summarize_prompt';

/**
 * Raw span data as returned from Elasticsearch ESQL queries.
 */
export interface RawSpanData {
  'trace.id': string;
  'span.id': string;
  'parent.span.id'?: string | null;
  name: string;
  duration: number;
  '@timestamp': string;
  'status.code'?: string | null;
  'status.message'?: string | null;
  'attributes.gen_ai.usage.input_tokens'?: number | null;
  'attributes.gen_ai.usage.output_tokens'?: number | null;
  'attributes.gen_ai.usage.cached_input_tokens'?: number | null;
  'attributes.gen_ai.request.model'?: string | null;
  'attributes.gen_ai.response.model'?: string | null;
  'attributes.elastic.inference.span.kind'?: string | null;
  'attributes.gen_ai.prompt'?: string | null;
  'attributes.gen_ai.completion'?: string | null;
  [key: string]: unknown;
}

/**
 * Normalized span structure for easier consumption.
 */
export interface NormalizedSpan {
  /** Unique span identifier */
  spanId: string;
  /** Parent span identifier (null for root spans) */
  parentSpanId: string | null;
  /** Span operation name */
  name: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Timestamp when the span started */
  timestamp: string;
  /** Status code (OK, ERROR, UNSET) */
  status: {
    code: string;
    message?: string;
  };
  /** Span kind (LLM, TOOL, AGENT, etc.) */
  kind?: string;
  /** Token usage metrics */
  tokens?: {
    input?: number;
    output?: number;
    cached?: number;
  };
  /** Model information */
  model?: {
    requested?: string;
    used?: string;
  };
  /** Whether this is an error span */
  isError: boolean;
  /** Depth in the span tree (0 for root) */
  depth: number;
  /** Original raw attributes for extension */
  rawAttributes: Record<string, unknown>;
}

/**
 * Aggregated metrics extracted from trace spans.
 */
export interface TraceMetrics {
  /** Total trace duration in milliseconds */
  totalDurationMs: number;
  /** Total number of spans */
  spanCount: number;
  /** Number of LLM inference spans */
  llmCallCount: number;
  /** Number of tool/function call spans */
  toolCallCount: number;
  /** Number of error spans */
  errorCount: number;
  /** Token usage totals */
  tokens: {
    input: number;
    output: number;
    cached: number;
    total: number;
  };
  /** Latency breakdown by span kind */
  latencyByKind: Record<string, number>;
  /** List of unique models used */
  modelsUsed: string[];
  /** List of tool names called */
  toolsCalled: string[];
}

/**
 * Preprocessed trace data ready for analysis.
 */
export interface PreprocessedTrace {
  /** Trace identifier */
  traceId: string;
  /** Root span name/operation */
  rootOperation: string | null;
  /** All normalized spans */
  spans: NormalizedSpan[];
  /** Aggregated metrics */
  metrics: TraceMetrics;
  /** Error spans for quick access */
  errorSpans: NormalizedSpan[];
  /** LLM spans for quick access */
  llmSpans: NormalizedSpan[];
  /** Tool spans for quick access */
  toolSpans: NormalizedSpan[];
}

/**
 * Configuration options for trace preprocessing.
 */
export interface TracePreprocessorConfig {
  /** Elasticsearch client for querying traces */
  esClient: EsClient;
  /** Index pattern to query (defaults to 'traces-*') */
  indexPattern?: string;
  /** Maximum number of spans to fetch (defaults to 1000) */
  maxSpans?: number;
  /** Retry configuration */
  retries?: number;
}

/**
 * Options for fetching trace data.
 */
export interface FetchTraceOptions {
  /** Fields to include in the query */
  includeFields?: string[];
  /** Filter by span kinds */
  spanKinds?: string[];
  /** Include raw prompt/completion content (may be large) */
  includeContent?: boolean;
}

/**
 * Result from Elasticsearch ESQL query.
 */
interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Validates a trace ID.
 * @param traceId - The trace ID to validate
 * @returns True if valid, false otherwise
 */
export function validateTraceId(traceId: string): boolean {
  return typeof traceId === 'string' && isValidTraceId(traceId);
}

/**
 * Creates a trace preprocessor instance with the given configuration.
 * @param config - Configuration for the preprocessor
 * @returns Trace preprocessor functions
 */
export function createTracePreprocessor(config: TracePreprocessorConfig) {
  const { esClient, indexPattern = 'traces-*', maxSpans = 1000, retries = 3 } = config;

  /**
   * Builds the ESQL query for fetching trace spans.
   */
  function buildSpanQuery(traceId: string, options: FetchTraceOptions = {}): string {
    const { includeContent = false, spanKinds } = options;

    const baseFields = [
      'trace.id',
      'span.id',
      'parent.span.id',
      'name',
      'duration',
      '@timestamp',
      'status.code',
      'status.message',
      'attributes.gen_ai.usage.input_tokens',
      'attributes.gen_ai.usage.output_tokens',
      'attributes.gen_ai.usage.cached_input_tokens',
      'attributes.gen_ai.request.model',
      'attributes.gen_ai.response.model',
      'attributes.elastic.inference.span.kind',
    ];

    if (includeContent) {
      baseFields.push('attributes.gen_ai.prompt', 'attributes.gen_ai.completion');
    }

    let query = `FROM ${indexPattern}
| WHERE trace.id == "${traceId}"`;

    if (spanKinds && spanKinds.length > 0) {
      const kindFilters = spanKinds.map((kind) => `"${kind}"`).join(', ');
      query += `
| WHERE attributes.elastic.inference.span.kind IN (${kindFilters})`;
    }

    query += `
| SORT @timestamp ASC
| LIMIT ${maxSpans}
| KEEP ${baseFields.join(', ')}`;

    return query;
  }

  /**
   * Converts ESQL response to span objects.
   */
  function esqlResponseToSpans(response: EsqlResponse): RawSpanData[] {
    const { columns, values } = response;

    return values.map((row) => {
      const span: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        span[col.name] = row[idx];
      });
      return span as RawSpanData;
    });
  }

  /**
   * Normalizes a raw span into a consistent structure.
   */
  function normalizeSpan(raw: RawSpanData, depth: number = 0): NormalizedSpan {
    const statusCode = raw['status.code'] || 'UNSET';
    const isError = statusCode === 'ERROR' || statusCode === '2'; // OTel error status code

    const tokens: NormalizedSpan['tokens'] = {};
    if (raw['attributes.gen_ai.usage.input_tokens'] != null) {
      tokens.input = raw['attributes.gen_ai.usage.input_tokens'];
    }
    if (raw['attributes.gen_ai.usage.output_tokens'] != null) {
      tokens.output = raw['attributes.gen_ai.usage.output_tokens'];
    }
    if (raw['attributes.gen_ai.usage.cached_input_tokens'] != null) {
      tokens.cached = raw['attributes.gen_ai.usage.cached_input_tokens'];
    }

    const model: NormalizedSpan['model'] = {};
    if (raw['attributes.gen_ai.request.model']) {
      model.requested = raw['attributes.gen_ai.request.model'];
    }
    if (raw['attributes.gen_ai.response.model']) {
      model.used = raw['attributes.gen_ai.response.model'];
    }

    // Extract raw attributes for extension
    const rawAttributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith('attributes.') && value != null) {
        rawAttributes[key.replace('attributes.', '')] = value;
      }
    }

    return {
      spanId: raw['span.id'],
      parentSpanId: raw['parent.span.id'] || null,
      name: raw.name,
      durationMs: raw.duration / 1_000_000, // Convert nanoseconds to milliseconds
      timestamp: raw['@timestamp'],
      status: {
        code: statusCode,
        message: raw['status.message'] || undefined,
      },
      kind: raw['attributes.elastic.inference.span.kind'] || undefined,
      tokens: Object.keys(tokens).length > 0 ? tokens : undefined,
      model: Object.keys(model).length > 0 ? model : undefined,
      isError,
      depth,
      rawAttributes,
    };
  }

  /**
   * Calculates span depths by building a tree structure.
   */
  function calculateSpanDepths(spans: NormalizedSpan[]): void {
    const spanMap = new Map<string, NormalizedSpan>();
    spans.forEach((span) => spanMap.set(span.spanId, span));

    function getDepth(span: NormalizedSpan): number {
      if (!span.parentSpanId || !spanMap.has(span.parentSpanId)) {
        return 0;
      }
      const parent = spanMap.get(span.parentSpanId)!;
      return getDepth(parent) + 1;
    }

    spans.forEach((span) => {
      span.depth = getDepth(span);
    });
  }

  /**
   * Extracts aggregated metrics from normalized spans.
   */
  function extractMetrics(spans: NormalizedSpan[]): TraceMetrics {
    const metrics: TraceMetrics = {
      totalDurationMs: 0,
      spanCount: spans.length,
      llmCallCount: 0,
      toolCallCount: 0,
      errorCount: 0,
      tokens: {
        input: 0,
        output: 0,
        cached: 0,
        total: 0,
      },
      latencyByKind: {},
      modelsUsed: [],
      toolsCalled: [],
    };

    const modelsSet = new Set<string>();
    const toolsSet = new Set<string>();

    for (const span of spans) {
      // Track max duration (root span duration)
      if (span.depth === 0) {
        metrics.totalDurationMs = Math.max(metrics.totalDurationMs, span.durationMs);
      }

      // Count by kind
      if (span.kind === 'LLM' || span.kind === 'INFERENCE') {
        metrics.llmCallCount++;
      } else if (span.kind === 'TOOL') {
        metrics.toolCallCount++;
        toolsSet.add(span.name);
      }

      // Count errors
      if (span.isError) {
        metrics.errorCount++;
      }

      // Aggregate tokens
      if (span.tokens) {
        metrics.tokens.input += span.tokens.input || 0;
        metrics.tokens.output += span.tokens.output || 0;
        metrics.tokens.cached += span.tokens.cached || 0;
      }

      // Track latency by kind
      if (span.kind) {
        metrics.latencyByKind[span.kind] =
          (metrics.latencyByKind[span.kind] || 0) + span.durationMs;
      }

      // Track models
      if (span.model?.used) {
        modelsSet.add(span.model.used);
      } else if (span.model?.requested) {
        modelsSet.add(span.model.requested);
      }
    }

    metrics.tokens.total = metrics.tokens.input + metrics.tokens.output - metrics.tokens.cached;
    metrics.modelsUsed = Array.from(modelsSet);
    metrics.toolsCalled = Array.from(toolsSet);

    return metrics;
  }

  /**
   * Fetches and preprocesses trace data for a given trace ID.
   * @param traceId - The trace ID to fetch
   * @param options - Fetch options
   * @returns Preprocessed trace data
   */
  async function fetchTrace(
    traceId: string,
    options: FetchTraceOptions = {}
  ): Promise<PreprocessedTrace> {
    if (!validateTraceId(traceId)) {
      throw new Error(`Invalid trace ID: ${traceId}`);
    }

    const query = buildSpanQuery(traceId, options);

    const response = await pRetry(
      async () => {
        const result = (await esClient.esql.query({ query })) as unknown as EsqlResponse;
        if (!result.values || result.values.length === 0) {
          throw new Error(`No spans found for trace ID: ${traceId}`);
        }
        return result;
      },
      { retries }
    );

    const rawSpans = esqlResponseToSpans(response);
    const normalizedSpans = rawSpans.map((raw) => normalizeSpan(raw));

    // Calculate depths
    calculateSpanDepths(normalizedSpans);

    // Sort by timestamp then depth
    normalizedSpans.sort((a, b) => {
      const timeCompare = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeCompare !== 0) return timeCompare;
      return a.depth - b.depth;
    });

    // Find root operation
    const rootSpan = normalizedSpans.find((span) => span.depth === 0);
    const rootOperation = rootSpan?.name || null;

    // Extract metrics
    const metrics = extractMetrics(normalizedSpans);

    // Categorize spans
    const errorSpans = normalizedSpans.filter((span) => span.isError);
    const llmSpans = normalizedSpans.filter(
      (span) => span.kind === 'LLM' || span.kind === 'INFERENCE'
    );
    const toolSpans = normalizedSpans.filter((span) => span.kind === 'TOOL');

    return {
      traceId,
      rootOperation,
      spans: normalizedSpans,
      metrics,
      errorSpans,
      llmSpans,
      toolSpans,
    };
  }

  /**
   * Fetches multiple traces in parallel.
   * @param traceIds - Array of trace IDs to fetch
   * @param options - Fetch options
   * @returns Map of trace ID to preprocessed trace (or error)
   */
  async function fetchTraces(
    traceIds: string[],
    options: FetchTraceOptions = {}
  ): Promise<Map<string, PreprocessedTrace | Error>> {
    const results = new Map<string, PreprocessedTrace | Error>();

    await Promise.all(
      traceIds.map(async (traceId) => {
        try {
          const trace = await fetchTrace(traceId, options);
          results.set(traceId, trace);
        } catch (error) {
          results.set(traceId, error instanceof Error ? error : new Error(String(error)));
        }
      })
    );

    return results;
  }

  return {
    fetchTrace,
    fetchTraces,
    buildSpanQuery,
    normalizeSpan,
    extractMetrics,
    validateTraceId,
  };
}

/**
 * Formats a preprocessed trace for display in prompts (compact JSON).
 * @param trace - The preprocessed trace data
 * @param options - Formatting options
 * @returns Formatted string representation
 */
export function formatTraceForPrompt(
  trace: PreprocessedTrace,
  options: {
    maxSpans?: number;
    includeRawAttributes?: boolean;
  } = {}
): string {
  const { maxSpans = 50, includeRawAttributes = false } = options;

  const spansToFormat = trace.spans.slice(0, maxSpans);
  const truncated = trace.spans.length > maxSpans;

  const formattedSpans = spansToFormat.map((span) => {
    const formatted: Record<string, unknown> = {
      name: span.name,
      durationMs: Math.round(span.durationMs * 100) / 100,
      depth: span.depth,
    };

    if (span.kind) {
      formatted.kind = span.kind;
    }

    if (span.isError) {
      formatted.status = span.status;
    }

    if (span.tokens && Object.keys(span.tokens).length > 0) {
      formatted.tokens = span.tokens;
    }

    if (span.model?.used || span.model?.requested) {
      formatted.model = span.model.used || span.model.requested;
    }

    if (includeRawAttributes && Object.keys(span.rawAttributes).length > 0) {
      formatted.attributes = span.rawAttributes;
    }

    return formatted;
  });

  let output = JSON.stringify(formattedSpans, null, 2);

  if (truncated) {
    output += `\n\n... (${trace.spans.length - maxSpans} more spans truncated)`;
  }

  return output;
}

/**
 * Converts a preprocessed trace to SummarizePromptInput format.
 * @param trace - The preprocessed trace data
 * @param options - Additional options for the prompt input
 * @returns SummarizePromptInput ready for use with the summarization prompt
 */
export function traceToSummarizeInput(
  trace: PreprocessedTrace,
  options: {
    focusAreas?: string[];
    maxSummaryLength?: 'brief' | 'standard' | 'detailed';
    additionalContext?: string;
    maxSpansForPrompt?: number;
  } = {}
): SummarizePromptInput {
  const { focusAreas, maxSummaryLength, additionalContext, maxSpansForPrompt = 50 } = options;

  return {
    traceId: trace.traceId,
    spans: formatTraceForPrompt(trace, { maxSpans: maxSpansForPrompt }),
    spanCount: trace.spans.length,
    totalDurationMs: trace.metrics.totalDurationMs,
    rootOperation: trace.rootOperation || undefined,
    focusAreas,
    maxSummaryLength,
    additionalContext,
  };
}

/**
 * Filters spans by a predicate function.
 * @param trace - The preprocessed trace
 * @param predicate - Filter predicate
 * @returns New preprocessed trace with filtered spans
 */
export function filterTraceSpans(
  trace: PreprocessedTrace,
  predicate: (span: NormalizedSpan) => boolean
): PreprocessedTrace {
  const filteredSpans = trace.spans.filter(predicate);
  const metrics = extractMetricsFromSpans(filteredSpans);

  return {
    ...trace,
    spans: filteredSpans,
    metrics,
    errorSpans: filteredSpans.filter((span) => span.isError),
    llmSpans: filteredSpans.filter((span) => span.kind === 'LLM' || span.kind === 'INFERENCE'),
    toolSpans: filteredSpans.filter((span) => span.kind === 'TOOL'),
  };
}

/**
 * Internal helper to extract metrics from spans.
 */
function extractMetricsFromSpans(spans: NormalizedSpan[]): TraceMetrics {
  const metrics: TraceMetrics = {
    totalDurationMs: 0,
    spanCount: spans.length,
    llmCallCount: 0,
    toolCallCount: 0,
    errorCount: 0,
    tokens: {
      input: 0,
      output: 0,
      cached: 0,
      total: 0,
    },
    latencyByKind: {},
    modelsUsed: [],
    toolsCalled: [],
  };

  const modelsSet = new Set<string>();
  const toolsSet = new Set<string>();

  for (const span of spans) {
    if (span.depth === 0) {
      metrics.totalDurationMs = Math.max(metrics.totalDurationMs, span.durationMs);
    }

    if (span.kind === 'LLM' || span.kind === 'INFERENCE') {
      metrics.llmCallCount++;
    } else if (span.kind === 'TOOL') {
      metrics.toolCallCount++;
      toolsSet.add(span.name);
    }

    if (span.isError) {
      metrics.errorCount++;
    }

    if (span.tokens) {
      metrics.tokens.input += span.tokens.input || 0;
      metrics.tokens.output += span.tokens.output || 0;
      metrics.tokens.cached += span.tokens.cached || 0;
    }

    if (span.kind) {
      metrics.latencyByKind[span.kind] = (metrics.latencyByKind[span.kind] || 0) + span.durationMs;
    }

    if (span.model?.used) {
      modelsSet.add(span.model.used);
    } else if (span.model?.requested) {
      modelsSet.add(span.model.requested);
    }
  }

  metrics.tokens.total = metrics.tokens.input + metrics.tokens.output - metrics.tokens.cached;
  metrics.modelsUsed = Array.from(modelsSet);
  metrics.toolsCalled = Array.from(toolsSet);

  return metrics;
}

/**
 * Summarizes multiple traces into aggregated statistics.
 * Useful for analyzing patterns across multiple evaluation examples.
 * @param traces - Array of preprocessed traces
 * @returns Aggregated statistics
 */
export function summarizeTraces(traces: PreprocessedTrace[]): {
  traceCount: number;
  totalMetrics: TraceMetrics;
  averageMetrics: {
    durationMs: number;
    spanCount: number;
    llmCallCount: number;
    toolCallCount: number;
    errorCount: number;
    inputTokens: number;
    outputTokens: number;
  };
  errorRate: number;
  allModelsUsed: string[];
  allToolsCalled: string[];
  tracesWithErrors: string[];
} {
  const traceCount = traces.length;

  if (traceCount === 0) {
    return {
      traceCount: 0,
      totalMetrics: {
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
      averageMetrics: {
        durationMs: 0,
        spanCount: 0,
        llmCallCount: 0,
        toolCallCount: 0,
        errorCount: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
      errorRate: 0,
      allModelsUsed: [],
      allToolsCalled: [],
      tracesWithErrors: [],
    };
  }

  const totalMetrics: TraceMetrics = {
    totalDurationMs: 0,
    spanCount: 0,
    llmCallCount: 0,
    toolCallCount: 0,
    errorCount: 0,
    tokens: { input: 0, output: 0, cached: 0, total: 0 },
    latencyByKind: {},
    modelsUsed: [],
    toolsCalled: [],
  };

  const modelsSet = new Set<string>();
  const toolsSet = new Set<string>();
  const tracesWithErrors: string[] = [];

  for (const trace of traces) {
    const m = trace.metrics;

    totalMetrics.totalDurationMs += m.totalDurationMs;
    totalMetrics.spanCount += m.spanCount;
    totalMetrics.llmCallCount += m.llmCallCount;
    totalMetrics.toolCallCount += m.toolCallCount;
    totalMetrics.errorCount += m.errorCount;
    totalMetrics.tokens.input += m.tokens.input;
    totalMetrics.tokens.output += m.tokens.output;
    totalMetrics.tokens.cached += m.tokens.cached;
    totalMetrics.tokens.total += m.tokens.total;

    for (const [kind, latency] of Object.entries(m.latencyByKind)) {
      totalMetrics.latencyByKind[kind] = (totalMetrics.latencyByKind[kind] || 0) + latency;
    }

    m.modelsUsed.forEach((model) => modelsSet.add(model));
    m.toolsCalled.forEach((tool) => toolsSet.add(tool));

    if (m.errorCount > 0) {
      tracesWithErrors.push(trace.traceId);
    }
  }

  totalMetrics.modelsUsed = Array.from(modelsSet);
  totalMetrics.toolsCalled = Array.from(toolsSet);

  return {
    traceCount,
    totalMetrics,
    averageMetrics: {
      durationMs: totalMetrics.totalDurationMs / traceCount,
      spanCount: totalMetrics.spanCount / traceCount,
      llmCallCount: totalMetrics.llmCallCount / traceCount,
      toolCallCount: totalMetrics.toolCallCount / traceCount,
      errorCount: totalMetrics.errorCount / traceCount,
      inputTokens: totalMetrics.tokens.input / traceCount,
      outputTokens: totalMetrics.tokens.output / traceCount,
    },
    errorRate: tracesWithErrors.length / traceCount,
    allModelsUsed: Array.from(modelsSet),
    allToolsCalled: Array.from(toolsSet),
    tracesWithErrors,
  };
}

/**
 * Options for the preprocessTraces convenience function.
 */
export interface PreprocessTracesOptions {
  /** Elasticsearch client for querying traces */
  esClient: EsClient;
  /** Trace IDs to fetch and preprocess */
  traceIds: string[];
  /** Index pattern to query (defaults to 'traces-*') */
  indexPattern?: string;
  /** Maximum spans per trace (defaults to 1000) */
  maxSpans?: number;
  /** Retry count for trace fetching (defaults to 3) */
  retries?: number;
  /** Options for fetching trace data */
  fetchOptions?: FetchTraceOptions;
  /** Whether to skip invalid trace IDs (defaults to true) */
  skipInvalidTraceIds?: boolean;
}

/**
 * Result from the preprocessTraces convenience function.
 */
export interface PreprocessTracesResult {
  /** Successfully preprocessed traces */
  traces: PreprocessedTrace[];
  /** Map of trace ID to error message for failed fetches */
  errors: Map<string, string>;
  /** List of trace IDs that were skipped due to invalid format */
  skippedTraceIds: string[];
  /** Summary of the preprocessing operation */
  summary: {
    /** Total trace IDs provided */
    totalRequested: number;
    /** Traces successfully fetched */
    successCount: number;
    /** Traces that failed to fetch */
    errorCount: number;
    /** Trace IDs skipped due to invalid format */
    skippedCount: number;
    /** Aggregated statistics across all successful traces */
    aggregatedStats: ReturnType<typeof summarizeTraces> | null;
  };
}

/**
 * Convenience function to preprocess multiple traces from Elasticsearch.
 *
 * This provides a simple, one-call interface for fetching and preprocessing
 * trace data without needing to instantiate a full TracePreprocessor or service.
 * It handles validation, error collection, and aggregation automatically.
 *
 * @param options - Options for preprocessing traces
 * @returns Preprocessed traces with errors and summary statistics
 *
 * @example
 * ```typescript
 * import { preprocessTraces } from '@kbn/evals';
 *
 * // Basic usage - preprocess traces by ID
 * const result = await preprocessTraces({
 *   esClient,
 *   traceIds: ['abc123...', 'def456...'],
 * });
 *
 * console.log(`Preprocessed ${result.summary.successCount} traces`);
 *
 * // Access individual traces
 * for (const trace of result.traces) {
 *   console.log(`Trace ${trace.traceId}: ${trace.metrics.llmCallCount} LLM calls`);
 * }
 *
 * // Check for errors
 * if (result.errors.size > 0) {
 *   for (const [traceId, error] of result.errors) {
 *     console.error(`Failed to fetch ${traceId}: ${error}`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * const result = await preprocessTraces({
 *   esClient,
 *   traceIds: traceIdList,
 *   indexPattern: 'traces-apm-*',
 *   maxSpans: 500,
 *   fetchOptions: {
 *     includeContent: true, // Include prompt/completion content
 *     spanKinds: ['LLM', 'TOOL'], // Only fetch LLM and tool spans
 *   },
 * });
 *
 * // Use aggregated statistics
 * if (result.summary.aggregatedStats) {
 *   const stats = result.summary.aggregatedStats;
 *   console.log(`Average LLM calls: ${stats.averageMetrics.llmCallCount}`);
 *   console.log(`Total tokens: ${stats.totalMetrics.tokens.total}`);
 * }
 * ```
 */
export async function preprocessTraces(
  options: PreprocessTracesOptions
): Promise<PreprocessTracesResult> {
  const {
    esClient,
    traceIds,
    indexPattern = 'traces-*',
    maxSpans = 1000,
    retries = 3,
    fetchOptions,
    skipInvalidTraceIds = true,
  } = options;

  const traces: PreprocessedTrace[] = [];
  const errors = new Map<string, string>();
  const skippedTraceIds: string[] = [];

  // Validate trace IDs
  const validTraceIds: string[] = [];
  for (const traceId of traceIds) {
    if (!validateTraceId(traceId)) {
      if (skipInvalidTraceIds) {
        skippedTraceIds.push(traceId);
      } else {
        throw new Error(`Invalid trace ID format: ${traceId}`);
      }
    } else {
      validTraceIds.push(traceId);
    }
  }

  // Deduplicate trace IDs
  const uniqueTraceIds = [...new Set(validTraceIds)];

  if (uniqueTraceIds.length === 0) {
    return {
      traces: [],
      errors,
      skippedTraceIds,
      summary: {
        totalRequested: traceIds.length,
        successCount: 0,
        errorCount: 0,
        skippedCount: skippedTraceIds.length,
        aggregatedStats: null,
      },
    };
  }

  // Create trace preprocessor and fetch traces
  const preprocessor = createTracePreprocessor({
    esClient,
    indexPattern,
    maxSpans,
    retries,
  });

  const traceResults = await preprocessor.fetchTraces(uniqueTraceIds, fetchOptions);

  // Process results
  for (const [traceId, result] of traceResults) {
    if (result instanceof Error) {
      errors.set(traceId, result.message);
    } else {
      traces.push(result);
    }
  }

  // Calculate aggregated statistics if we have traces
  const aggregatedStats = traces.length > 0 ? summarizeTraces(traces) : null;

  return {
    traces,
    errors,
    skippedTraceIds,
    summary: {
      totalRequested: traceIds.length,
      successCount: traces.length,
      errorCount: errors.size,
      skippedCount: skippedTraceIds.length,
      aggregatedStats,
    },
  };
}
