/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreprocessedTrace, NormalizedSpan } from './trace_preprocessor';
import {
  createTokenEfficiencyAnalyzer,
  type TokenEfficiencyAnalyzerConfig,
  type TokenEfficiencyResult,
} from './token_efficiency_analyzer';
import {
  createCrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzerConfig,
} from './cross_trace_pattern_analyzer';
import type {
  TraceAnalysisResult,
  TraceAnalysisPattern,
  TraceAnalysisIssue,
  TraceTokenAnalysis,
  TraceLatencyAnalysis,
  TraceToolAnalysis,
  TraceLlmCallAnalysis,
  TraceErrorAnalysis,
  TraceIssueSeverity,
  TracePatternType,
  BatchTraceAnalysisSummary,
  CrossTraceAnalysisResult,
} from './analysis_schemas';

/**
 * Configuration for the trace analysis engine.
 */
export interface TraceAnalysisEngineConfig {
  /**
   * Configuration for token efficiency analysis.
   */
  tokenEfficiencyConfig?: TokenEfficiencyAnalyzerConfig;

  /**
   * Configuration for cross-trace pattern analysis.
   */
  crossTracePatternConfig?: CrossTracePatternAnalyzerConfig;

  /**
   * Latency thresholds for identifying performance issues.
   */
  latencyThresholds?: {
    /** Maximum acceptable total trace duration in ms (default: 30000) */
    maxTotalDurationMs?: number;
    /** Maximum acceptable LLM call duration in ms (default: 10000) */
    maxLlmCallDurationMs?: number;
    /** Maximum acceptable tool call duration in ms (default: 5000) */
    maxToolCallDurationMs?: number;
    /** Percentage of time in LLM calls above which to flag (default: 80) */
    llmLatencyPercentageThreshold?: number;
  };

  /**
   * Tool analysis thresholds.
   */
  toolThresholds?: {
    /** Maximum acceptable tool failure rate (default: 0.1) */
    maxToolFailureRate?: number;
    /** Maximum number of calls to the same tool before flagging redundancy (default: 5) */
    redundantCallThreshold?: number;
  };

  /**
   * LLM call analysis thresholds.
   */
  llmCallThresholds?: {
    /** Maximum acceptable LLM calls per trace (default: 10) */
    maxLlmCallsPerTrace?: number;
    /** Threshold for detecting sequential call chains (default: 3) */
    sequentialCallChainThreshold?: number;
  };

  /**
   * Error analysis configuration.
   */
  errorConfig?: {
    /** Maximum acceptable error rate (default: 0.1) */
    maxErrorRate?: number;
    /** Whether to track error propagation chains (default: true) */
    trackErrorPropagation?: boolean;
  };

  /**
   * Focus areas for analysis. If not specified, all areas are analyzed.
   */
  focusAreas?: Array<'tokens' | 'latency' | 'tools' | 'errors' | 'patterns'>;

  /**
   * Whether to enable cross-trace pattern analysis (default: true).
   */
  enableCrossTraceAnalysis?: boolean;
}

/**
 * Result from analyzing a single trace.
 */
export interface TraceAnalysisEngineResult extends TraceAnalysisResult {
  /** Token efficiency analysis details (if available) */
  tokenEfficiencyResult?: TokenEfficiencyResult;
}

/**
 * Result from analyzing multiple traces.
 */
export interface BatchTraceAnalysisResult {
  /** Individual trace analysis results */
  traceResults: TraceAnalysisEngineResult[];
  /** Summary across all traces */
  summary: BatchTraceAnalysisSummary;
  /** Aggregated patterns across all traces */
  aggregatedPatterns: Array<{
    type: TracePatternType;
    frequency: number;
    avgSeverity: TraceIssueSeverity;
    traceIds: string[];
  }>;
  /** Top recommendations based on aggregate analysis */
  recommendations: string[];
  /** Cross-trace pattern analysis results (if enabled) */
  crossTraceAnalysis?: CrossTraceAnalysisResult;
}

/**
 * Creates a trace analysis engine with the given configuration.
 *
 * The trace analysis engine provides comprehensive analysis of OpenTelemetry traces,
 * including token efficiency, latency bottlenecks, tool usage patterns, and error detection.
 *
 * @param config - Configuration options for the analysis engine
 * @returns Trace analysis engine functions
 *
 * @example
 * ```typescript
 * const engine = createTraceAnalysisEngine({
 *   latencyThresholds: {
 *     maxTotalDurationMs: 30000,
 *     maxLlmCallDurationMs: 10000,
 *   },
 *   toolThresholds: {
 *     maxToolFailureRate: 0.1,
 *   },
 * });
 *
 * // Analyze a single trace
 * const result = engine.analyzeTrace(preprocessedTrace);
 * console.log(`Health score: ${result.summary.overallHealthScore}`);
 *
 * // Analyze multiple traces
 * const batchResult = engine.analyzeTraces(traces);
 * console.log(`Analyzed ${batchResult.summary.totalTracesAnalyzed} traces`);
 * ```
 */
export function createTraceAnalysisEngine(config: TraceAnalysisEngineConfig = {}) {
  const {
    tokenEfficiencyConfig = {},
    crossTracePatternConfig = {},
    latencyThresholds = {},
    toolThresholds = {},
    llmCallThresholds = {},
    errorConfig = {},
    focusAreas,
    enableCrossTraceAnalysis = true,
  } = config;

  // Set default thresholds
  const {
    maxTotalDurationMs = 30000,
    maxLlmCallDurationMs = 10000,
    maxToolCallDurationMs = 5000,
    llmLatencyPercentageThreshold = 80,
  } = latencyThresholds;

  const { maxToolFailureRate = 0.1, redundantCallThreshold = 5 } = toolThresholds;

  const { maxLlmCallsPerTrace = 10, sequentialCallChainThreshold = 3 } = llmCallThresholds;

  const { maxErrorRate = 0.1, trackErrorPropagation = true } = errorConfig;

  // Create token efficiency analyzer
  const tokenAnalyzer = createTokenEfficiencyAnalyzer(tokenEfficiencyConfig);

  // Create cross-trace pattern analyzer
  const crossTraceAnalyzer = createCrossTracePatternAnalyzer(crossTracePatternConfig);

  // Issue counter for unique IDs
  let issueCounter = 0;

  /**
   * Generates a unique issue ID.
   */
  function generateIssueId(): string {
    const timestamp = Date.now().toString(36);
    return `issue-${timestamp}-${issueCounter++}`;
  }

  /**
   * Determines if a focus area should be analyzed.
   */
  function shouldAnalyze(area: 'tokens' | 'latency' | 'tools' | 'errors' | 'patterns'): boolean {
    return !focusAreas || focusAreas.includes(area);
  }

  /**
   * Analyzes latency characteristics of the trace.
   */
  function analyzeLatency(trace: PreprocessedTrace): TraceLatencyAnalysis {
    const { metrics, spans, llmSpans, toolSpans } = trace;

    // Calculate latency breakdown
    const llmLatencyMs = llmSpans.reduce((sum, span) => sum + span.durationMs, 0);
    const toolLatencyMs = toolSpans.reduce((sum, span) => sum + span.durationMs, 0);
    const overheadLatencyMs = Math.max(0, metrics.totalDurationMs - llmLatencyMs - toolLatencyMs);
    const llmLatencyPercentage =
      metrics.totalDurationMs > 0 ? (llmLatencyMs / metrics.totalDurationMs) * 100 : 0;

    // Find critical path (longest spans at each depth level)
    const criticalPath = findCriticalPath(spans, metrics.totalDurationMs);

    // Identify bottlenecks
    const bottlenecks = identifyBottlenecks(spans, {
      maxLlmCallDurationMs,
      maxToolCallDurationMs,
      totalDurationMs: metrics.totalDurationMs,
    });

    return {
      totalDurationMs: metrics.totalDurationMs,
      llmLatencyMs,
      toolLatencyMs,
      overheadLatencyMs,
      llmLatencyPercentage: Math.round(llmLatencyPercentage * 10) / 10,
      criticalPath,
      bottlenecks,
    };
  }

  /**
   * Finds the critical path through the trace.
   */
  function findCriticalPath(
    spans: NormalizedSpan[],
    totalDurationMs: number
  ): TraceLatencyAnalysis['criticalPath'] {
    // Sort spans by duration descending
    const sortedByDuration = [...spans].sort((a, b) => b.durationMs - a.durationMs);

    // Take top spans that contribute significantly to total duration
    const significantSpans = sortedByDuration.filter(
      (span) => span.durationMs > totalDurationMs * 0.05
    );

    return significantSpans.slice(0, 10).map((span) => ({
      spanId: span.spanId,
      spanName: span.name,
      durationMs: Math.round(span.durationMs * 100) / 100,
      percentage: Math.round((span.durationMs / totalDurationMs) * 1000) / 10,
    }));
  }

  /**
   * Identifies performance bottlenecks in the trace.
   */
  function identifyBottlenecks(
    spans: NormalizedSpan[],
    thresholds: {
      maxLlmCallDurationMs: number;
      maxToolCallDurationMs: number;
      totalDurationMs: number;
    }
  ): TraceLatencyAnalysis['bottlenecks'] {
    const bottlenecks: TraceLatencyAnalysis['bottlenecks'] = [];

    for (const span of spans) {
      let reason: string | null = null;

      if (
        (span.kind === 'LLM' || span.kind === 'INFERENCE') &&
        span.durationMs > thresholds.maxLlmCallDurationMs
      ) {
        reason = `LLM call exceeded ${thresholds.maxLlmCallDurationMs}ms threshold`;
      } else if (span.kind === 'TOOL' && span.durationMs > thresholds.maxToolCallDurationMs) {
        reason = `Tool call exceeded ${thresholds.maxToolCallDurationMs}ms threshold`;
      } else if (span.durationMs > thresholds.totalDurationMs * 0.5) {
        reason = `Single span consumes >50% of total trace duration`;
      }

      if (reason) {
        bottlenecks.push({
          spanId: span.spanId,
          spanName: span.name,
          durationMs: Math.round(span.durationMs * 100) / 100,
          reason,
        });
      }
    }

    return bottlenecks.slice(0, 10);
  }

  /**
   * Analyzes tool usage patterns in the trace.
   */
  function analyzeTools(trace: PreprocessedTrace): TraceToolAnalysis {
    const { toolSpans } = trace;

    // Count calls by tool name
    const toolCallsByName: Record<string, number> = {};
    const toolLatencyByName: Record<string, { total: number; count: number }> = {};
    const toolSpanIdsByName: Record<string, string[]> = {};

    let failedToolCalls = 0;

    for (const span of toolSpans) {
      const toolName = span.name;
      toolCallsByName[toolName] = (toolCallsByName[toolName] || 0) + 1;

      if (!toolLatencyByName[toolName]) {
        toolLatencyByName[toolName] = { total: 0, count: 0 };
      }
      toolLatencyByName[toolName].total += span.durationMs;
      toolLatencyByName[toolName].count++;

      if (!toolSpanIdsByName[toolName]) {
        toolSpanIdsByName[toolName] = [];
      }
      toolSpanIdsByName[toolName].push(span.spanId);

      if (span.isError) {
        failedToolCalls++;
      }
    }

    // Calculate average latency per tool
    const avgToolLatencyByName: Record<string, number> = {};
    for (const [name, data] of Object.entries(toolLatencyByName)) {
      avgToolLatencyByName[name] = Math.round((data.total / data.count) * 100) / 100;
    }

    // Detect redundant calls
    const redundantCalls: TraceToolAnalysis['redundantCalls'] = [];
    for (const [toolName, count] of Object.entries(toolCallsByName)) {
      if (count >= redundantCallThreshold) {
        redundantCalls.push({
          toolName,
          count,
          spanIds: toolSpanIdsByName[toolName],
        });
      }
    }

    const totalToolCalls = toolSpans.length;
    const toolFailureRate = totalToolCalls > 0 ? failedToolCalls / totalToolCalls : 0;
    const avgToolLatencyMs =
      totalToolCalls > 0
        ? toolSpans.reduce((sum, span) => sum + span.durationMs, 0) / totalToolCalls
        : 0;

    return {
      totalToolCalls,
      uniqueToolsUsed: Object.keys(toolCallsByName),
      toolCallsByName,
      failedToolCalls,
      toolFailureRate: Math.round(toolFailureRate * 1000) / 1000,
      avgToolLatencyMs: Math.round(avgToolLatencyMs * 100) / 100,
      toolLatencyByName: avgToolLatencyByName,
      redundantCalls: redundantCalls.length > 0 ? redundantCalls : undefined,
    };
  }

  /**
   * Analyzes LLM call patterns in the trace.
   */
  function analyzeLlmCalls(trace: PreprocessedTrace): TraceLlmCallAnalysis {
    const { llmSpans, metrics } = trace;

    // Count calls by model
    const callsByModel: Record<string, number> = {};
    const tokensByModel: Record<string, { input: number; output: number }> = {};

    for (const span of llmSpans) {
      const model = span.model?.used || span.model?.requested || 'unknown';
      callsByModel[model] = (callsByModel[model] || 0) + 1;

      if (!tokensByModel[model]) {
        tokensByModel[model] = { input: 0, output: 0 };
      }
      tokensByModel[model].input += span.tokens?.input || 0;
      tokensByModel[model].output += span.tokens?.output || 0;
    }

    // Calculate durations
    const durations = llmSpans.map((span) => span.durationMs);
    const avgCallDurationMs =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const maxCallDurationMs = durations.length > 0 ? Math.max(...durations) : 0;

    // Detect sequential call chains
    const sequentialCallsCount = detectSequentialCallChains(llmSpans, sequentialCallChainThreshold);

    return {
      totalLlmCalls: llmSpans.length,
      modelsUsed: metrics.modelsUsed,
      avgCallDurationMs: Math.round(avgCallDurationMs * 100) / 100,
      maxCallDurationMs: Math.round(maxCallDurationMs * 100) / 100,
      callsByModel,
      tokensByModel,
      sequentialCallsCount,
    };
  }

  /**
   * Detects sequential LLM call chains.
   */
  function detectSequentialCallChains(llmSpans: NormalizedSpan[], threshold: number): number {
    if (llmSpans.length < threshold) return 0;

    // Group spans by parent
    const childrenByParent = new Map<string, NormalizedSpan[]>();
    for (const span of llmSpans) {
      const parentId = span.parentSpanId || 'root';
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(span);
    }

    // Count sequential chains
    let sequentialChains = 0;
    for (const children of childrenByParent.values()) {
      if (children.length >= threshold) {
        // Check if they're sequential (non-overlapping timestamps)
        const sorted = [...children].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let chainLength = 1;
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = new Date(sorted[i - 1].timestamp).getTime() + sorted[i - 1].durationMs;
          const currStart = new Date(sorted[i].timestamp).getTime();

          if (currStart >= prevEnd) {
            chainLength++;
          } else {
            if (chainLength >= threshold) {
              sequentialChains++;
            }
            chainLength = 1;
          }
        }
        if (chainLength >= threshold) {
          sequentialChains++;
        }
      }
    }

    return sequentialChains;
  }

  /**
   * Analyzes errors in the trace.
   */
  function analyzeErrors(trace: PreprocessedTrace): TraceErrorAnalysis {
    const { spans, errorSpans, metrics } = trace;

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    const errorDetails: TraceErrorAnalysis['errorSpans'] = [];

    for (const span of errorSpans) {
      const errorType = span.status.message || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      errorDetails.push({
        spanId: span.spanId,
        spanName: span.name,
        errorMessage: span.status.message,
        errorType,
        timestamp: span.timestamp,
        isRecovered: false, // TODO: Detect recovery patterns
      });
    }

    // Detect error propagation
    const errorPropagation: TraceErrorAnalysis['errorPropagation'] = trackErrorPropagation
      ? detectErrorPropagation(spans, errorSpans)
      : undefined;

    const errorRate = metrics.spanCount > 0 ? errorSpans.length / metrics.spanCount : 0;

    return {
      totalErrors: errorSpans.length,
      errorRate: Math.round(errorRate * 1000) / 1000,
      errorsByType,
      errorSpans: errorDetails,
      errorPropagation,
    };
  }

  /**
   * Detects error propagation chains.
   */
  function detectErrorPropagation(
    spans: NormalizedSpan[],
    errorSpans: NormalizedSpan[]
  ): TraceErrorAnalysis['errorPropagation'] {
    const propagation: TraceErrorAnalysis['errorPropagation'] = [];

    // Build parent-child relationships
    const childrenMap = new Map<string, string[]>();
    for (const span of spans) {
      if (span.parentSpanId) {
        if (!childrenMap.has(span.parentSpanId)) {
          childrenMap.set(span.parentSpanId, []);
        }
        childrenMap.get(span.parentSpanId)!.push(span.spanId);
      }
    }

    // For each error span, trace affected descendants
    const errorSpanIds = new Set(errorSpans.map((s) => s.spanId));

    for (const errorSpan of errorSpans) {
      const affectedSpanIds: string[] = [];
      const queue = [...(childrenMap.get(errorSpan.spanId) || [])];
      let depth = 0;

      while (queue.length > 0) {
        const currentLevelSize = queue.length;
        depth++;

        for (let i = 0; i < currentLevelSize; i++) {
          const childId = queue.shift()!;
          const childSpan = spans.find((s) => s.spanId === childId);

          if (childSpan?.isError) {
            affectedSpanIds.push(childId);
            const grandchildren = childrenMap.get(childId) || [];
            queue.push(...grandchildren);
          }
        }
      }

      if (affectedSpanIds.length > 0) {
        propagation.push({
          sourceSpanId: errorSpan.spanId,
          affectedSpanIds,
          propagationDepth: depth,
        });
      }
    }

    return propagation.length > 0 ? propagation : undefined;
  }

  /**
   * Detects patterns across all analysis dimensions.
   */
  function detectPatterns(
    trace: PreprocessedTrace,
    latencyAnalysis: TraceLatencyAnalysis | null,
    toolAnalysis: TraceToolAnalysis | null,
    llmCallAnalysis: TraceLlmCallAnalysis | null,
    errorAnalysis: TraceErrorAnalysis | null,
    tokenEfficiencyResult: TokenEfficiencyResult | null
  ): TraceAnalysisPattern[] {
    const patterns: TraceAnalysisPattern[] = [];

    // Pattern: Excessive LLM calls
    if (llmCallAnalysis && llmCallAnalysis.totalLlmCalls > maxLlmCallsPerTrace) {
      patterns.push({
        type: 'excessive_llm_calls',
        description: `Trace contains ${llmCallAnalysis.totalLlmCalls} LLM calls, exceeding the recommended limit of ${maxLlmCallsPerTrace}.`,
        severity: llmCallAnalysis.totalLlmCalls > maxLlmCallsPerTrace * 2 ? 'warning' : 'info',
        spanIds: trace.llmSpans.map((s) => s.spanId),
        metrics: {
          count: llmCallAnalysis.totalLlmCalls,
        },
        recommendation:
          'Consider consolidating prompts or using batch operations to reduce LLM call overhead.',
      });
    }

    // Pattern: High latency
    if (latencyAnalysis && latencyAnalysis.totalDurationMs > maxTotalDurationMs) {
      patterns.push({
        type: 'high_latency',
        description: `Total trace duration (${Math.round(
          latencyAnalysis.totalDurationMs
        )}ms) exceeds the ${maxTotalDurationMs}ms threshold.`,
        severity: latencyAnalysis.totalDurationMs > maxTotalDurationMs * 2 ? 'critical' : 'warning',
        spanIds: latencyAnalysis.criticalPath.map((cp) => cp.spanId),
        metrics: {
          totalDurationMs: latencyAnalysis.totalDurationMs,
          percentage: (latencyAnalysis.totalDurationMs / maxTotalDurationMs) * 100,
        },
        recommendation:
          'Review the critical path spans and consider parallelization or caching strategies.',
      });
    }

    // Pattern: High LLM latency percentage
    if (latencyAnalysis && latencyAnalysis.llmLatencyPercentage > llmLatencyPercentageThreshold) {
      patterns.push({
        type: 'sequential_bottleneck',
        description: `LLM calls consume ${latencyAnalysis.llmLatencyPercentage.toFixed(
          1
        )}% of total trace duration.`,
        severity: 'info',
        spanIds: trace.llmSpans.map((s) => s.spanId),
        metrics: {
          percentage: latencyAnalysis.llmLatencyPercentage,
        },
        recommendation:
          'Consider parallelizing LLM calls where possible or using streaming responses.',
      });
    }

    // Pattern: Tool failures
    if (toolAnalysis && toolAnalysis.toolFailureRate > maxToolFailureRate) {
      patterns.push({
        type: 'tool_failures',
        description: `Tool failure rate (${(toolAnalysis.toolFailureRate * 100).toFixed(
          1
        )}%) exceeds the ${(maxToolFailureRate * 100).toFixed(0)}% threshold.`,
        severity: toolAnalysis.toolFailureRate > maxToolFailureRate * 2 ? 'critical' : 'warning',
        spanIds: trace.toolSpans.filter((s) => s.isError).map((s) => s.spanId),
        metrics: {
          count: toolAnalysis.failedToolCalls,
          percentage: toolAnalysis.toolFailureRate * 100,
        },
        recommendation:
          'Investigate failing tools and implement proper error handling and retry logic.',
      });
    }

    // Pattern: Redundant tool calls
    if (toolAnalysis?.redundantCalls && toolAnalysis.redundantCalls.length > 0) {
      for (const redundant of toolAnalysis.redundantCalls) {
        patterns.push({
          type: 'redundant_calls',
          description: `Tool "${redundant.toolName}" was called ${redundant.count} times, which may indicate redundant operations.`,
          severity: 'info',
          spanIds: redundant.spanIds,
          metrics: {
            count: redundant.count,
          },
          recommendation: `Consider caching results from "${redundant.toolName}" or batching multiple operations.`,
        });
      }
    }

    // Pattern: Error propagation
    if (errorAnalysis?.errorPropagation && errorAnalysis.errorPropagation.length > 0) {
      for (const propagation of errorAnalysis.errorPropagation) {
        if (propagation.propagationDepth > 1) {
          patterns.push({
            type: 'error_propagation',
            description: `Error propagated through ${propagation.propagationDepth} levels, affecting ${propagation.affectedSpanIds.length} downstream spans.`,
            severity: propagation.propagationDepth > 3 ? 'critical' : 'warning',
            spanIds: [propagation.sourceSpanId, ...propagation.affectedSpanIds],
            metrics: {
              count: propagation.affectedSpanIds.length + 1,
            },
            recommendation:
              'Implement error boundaries or circuit breakers to prevent cascading failures.',
          });
        }
      }
    }

    // Include patterns from token efficiency analysis
    if (tokenEfficiencyResult) {
      patterns.push(...tokenEfficiencyResult.patterns);
    }

    return patterns;
  }

  /**
   * Generates issues from analysis results.
   */
  function generateIssues(
    trace: PreprocessedTrace,
    latencyAnalysis: TraceLatencyAnalysis | null,
    toolAnalysis: TraceToolAnalysis | null,
    errorAnalysis: TraceErrorAnalysis | null
  ): TraceAnalysisIssue[] {
    const issues: TraceAnalysisIssue[] = [];

    // Issues from bottlenecks
    if (latencyAnalysis) {
      for (const bottleneck of latencyAnalysis.bottlenecks) {
        issues.push({
          id: generateIssueId(),
          title: 'Performance Bottleneck Detected',
          description: bottleneck.reason,
          severity: 'warning',
          spanId: bottleneck.spanId,
          spanName: bottleneck.spanName,
          context: {
            durationMs: bottleneck.durationMs,
          },
          suggestedFix: 'Review this span for optimization opportunities.',
        });
      }
    }

    // Issues from errors
    if (errorAnalysis) {
      for (const errorSpan of errorAnalysis.errorSpans.slice(0, 5)) {
        issues.push({
          id: generateIssueId(),
          title: 'Error in Trace',
          description: errorSpan.errorMessage || 'An error occurred during execution.',
          severity: 'critical',
          spanId: errorSpan.spanId,
          spanName: errorSpan.spanName,
          timestamp: errorSpan.timestamp,
          context: {
            errorType: errorSpan.errorType,
          },
          suggestedFix: 'Investigate the error cause and implement appropriate error handling.',
        });
      }
    }

    // Issues from tool failures
    if (toolAnalysis && toolAnalysis.failedToolCalls > 0) {
      const failedTools = trace.toolSpans.filter((s) => s.isError);
      for (const tool of failedTools.slice(0, 3)) {
        issues.push({
          id: generateIssueId(),
          title: 'Tool Call Failed',
          description: `Tool "${tool.name}" failed during execution.`,
          severity: 'warning',
          spanId: tool.spanId,
          spanName: tool.name,
          timestamp: tool.timestamp,
          suggestedFix: 'Check tool input parameters and ensure the tool service is available.',
        });
      }
    }

    return issues;
  }

  /**
   * Calculates overall health score from analysis results.
   */
  function calculateHealthScore(
    trace: PreprocessedTrace,
    latencyAnalysis: TraceLatencyAnalysis | null,
    toolAnalysis: TraceToolAnalysis | null,
    errorAnalysis: TraceErrorAnalysis | null,
    tokenEfficiencyResult: TokenEfficiencyResult | null,
    patterns: TraceAnalysisPattern[]
  ): number {
    let score = 1.0;

    // Deduct for errors
    if (errorAnalysis && errorAnalysis.errorRate > 0) {
      score -= Math.min(0.3, errorAnalysis.errorRate);
    }

    // Deduct for high latency
    if (latencyAnalysis && latencyAnalysis.totalDurationMs > maxTotalDurationMs) {
      const latencyPenalty = Math.min(
        0.2,
        (latencyAnalysis.totalDurationMs / maxTotalDurationMs - 1) * 0.1
      );
      score -= latencyPenalty;
    }

    // Deduct for tool failures
    if (toolAnalysis && toolAnalysis.toolFailureRate > maxToolFailureRate) {
      score -= Math.min(0.2, toolAnalysis.toolFailureRate);
    }

    // Factor in token efficiency
    if (tokenEfficiencyResult) {
      const tokenScore = tokenEfficiencyResult.tokenAnalysis.tokenEfficiencyScore;
      score = score * 0.7 + tokenScore * 0.3;
    }

    // Deduct for critical patterns
    const criticalPatterns = patterns.filter((p) => p.severity === 'critical');
    score -= criticalPatterns.length * 0.1;

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  /**
   * Generates top recommendations based on analysis.
   */
  function generateRecommendations(
    patterns: TraceAnalysisPattern[],
    issues: TraceAnalysisIssue[]
  ): string[] {
    const recommendations = new Set<string>();

    // Add recommendations from patterns
    for (const pattern of patterns) {
      if (pattern.recommendation) {
        recommendations.add(pattern.recommendation);
      }
    }

    // Add recommendations from issues
    for (const issue of issues) {
      if (issue.suggestedFix) {
        recommendations.add(issue.suggestedFix);
      }
    }

    // Sort by severity (critical patterns first)
    const sortedPatterns = [...patterns].sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const orderedRecommendations: string[] = [];
    for (const pattern of sortedPatterns) {
      if (pattern.recommendation && !orderedRecommendations.includes(pattern.recommendation)) {
        orderedRecommendations.push(pattern.recommendation);
      }
    }

    // Add any remaining recommendations
    for (const rec of recommendations) {
      if (!orderedRecommendations.includes(rec)) {
        orderedRecommendations.push(rec);
      }
    }

    return orderedRecommendations.slice(0, 10);
  }

  /**
   * Analyzes a single preprocessed trace.
   */
  function analyzeTrace(trace: PreprocessedTrace): TraceAnalysisEngineResult {
    // Run token efficiency analysis if configured
    let tokenEfficiencyResult: TokenEfficiencyResult | null = null;
    let tokenAnalysis: TraceTokenAnalysis | undefined;

    if (shouldAnalyze('tokens')) {
      tokenEfficiencyResult = tokenAnalyzer.analyzeTrace(trace);
      tokenAnalysis = tokenEfficiencyResult.tokenAnalysis;
    }

    // Run latency analysis
    let latencyAnalysis: TraceLatencyAnalysis | undefined;
    if (shouldAnalyze('latency')) {
      latencyAnalysis = analyzeLatency(trace);
    }

    // Run tool analysis
    let toolAnalysis: TraceToolAnalysis | undefined;
    if (shouldAnalyze('tools')) {
      toolAnalysis = analyzeTools(trace);
    }

    // Run LLM call analysis
    let llmCallAnalysis: TraceLlmCallAnalysis | undefined;
    if (shouldAnalyze('tools') || shouldAnalyze('latency')) {
      llmCallAnalysis = analyzeLlmCalls(trace);
    }

    // Run error analysis
    let errorAnalysis: TraceErrorAnalysis | undefined;
    if (shouldAnalyze('errors')) {
      errorAnalysis = analyzeErrors(trace);
    }

    // Detect patterns
    const patterns = shouldAnalyze('patterns')
      ? detectPatterns(
          trace,
          latencyAnalysis || null,
          toolAnalysis || null,
          llmCallAnalysis || null,
          errorAnalysis || null,
          tokenEfficiencyResult
        )
      : [];

    // Generate issues
    const issues = generateIssues(
      trace,
      latencyAnalysis || null,
      toolAnalysis || null,
      errorAnalysis || null
    );

    // Calculate health score
    const healthScore = calculateHealthScore(
      trace,
      latencyAnalysis || null,
      toolAnalysis || null,
      errorAnalysis || null,
      tokenEfficiencyResult,
      patterns
    );

    // Generate recommendations
    const recommendations = generateRecommendations(patterns, issues);

    // Build primary issues list
    const primaryIssues = patterns
      .filter((p) => p.severity === 'critical' || p.severity === 'warning')
      .map((p) => p.description)
      .slice(0, 5);

    return {
      traceId: trace.traceId,
      analyzedAt: new Date().toISOString(),
      summary: {
        overallHealthScore: healthScore,
        totalSpans: trace.metrics.spanCount,
        totalDurationMs: trace.metrics.totalDurationMs,
        primaryIssues,
        recommendations,
      },
      tokenAnalysis,
      latencyAnalysis,
      toolAnalysis,
      llmCallAnalysis,
      errorAnalysis,
      detectedPatterns: patterns,
      issues,
      tokenEfficiencyResult: tokenEfficiencyResult || undefined,
    };
  }

  /**
   * Analyzes multiple traces and produces aggregated results.
   */
  function analyzeTraces(traces: PreprocessedTrace[]): BatchTraceAnalysisResult {
    if (traces.length === 0) {
      return {
        traceResults: [],
        summary: {
          totalTracesAnalyzed: 0,
          avgHealthScore: 0,
          commonPatterns: [],
          commonIssues: [],
          aggregateMetrics: {
            avgDurationMs: 0,
            avgTokensPerTrace: 0,
            avgLlmCallsPerTrace: 0,
            avgToolCallsPerTrace: 0,
            overallErrorRate: 0,
          },
          topRecommendations: [],
        },
        aggregatedPatterns: [],
        recommendations: [],
      };
    }

    // Analyze each trace
    const traceResults = traces.map((trace) => analyzeTrace(trace));

    // Aggregate patterns
    const patternMap = new Map<
      TracePatternType,
      {
        count: number;
        severities: TraceIssueSeverity[];
        traceIds: string[];
      }
    >();

    for (const result of traceResults) {
      for (const pattern of result.detectedPatterns) {
        const existing = patternMap.get(pattern.type) || {
          count: 0,
          severities: [],
          traceIds: [],
        };
        existing.count++;
        existing.severities.push(pattern.severity);
        if (!existing.traceIds.includes(result.traceId)) {
          existing.traceIds.push(result.traceId);
        }
        patternMap.set(pattern.type, existing);
      }
    }

    const aggregatedPatterns = Array.from(patternMap.entries())
      .map(([type, data]) => ({
        type,
        frequency: data.count,
        avgSeverity: getMostCommonSeverity(data.severities),
        traceIds: data.traceIds,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Aggregate issues
    const issueMap = new Map<string, { count: number; severity: TraceIssueSeverity }>();
    for (const result of traceResults) {
      for (const issue of result.issues) {
        const existing = issueMap.get(issue.title) || { count: 0, severity: issue.severity };
        existing.count++;
        issueMap.set(issue.title, existing);
      }
    }

    const commonIssues = Array.from(issueMap.entries())
      .map(([title, data]) => ({
        title,
        frequency: data.count,
        severity: data.severity,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Calculate aggregate metrics
    const totalMetrics = traces.reduce(
      (acc, trace) => {
        acc.totalDuration += trace.metrics.totalDurationMs;
        acc.totalTokens += trace.metrics.tokens.total;
        acc.totalLlmCalls += trace.metrics.llmCallCount;
        acc.totalToolCalls += trace.metrics.toolCallCount;
        acc.totalErrors += trace.metrics.errorCount;
        acc.totalSpans += trace.metrics.spanCount;
        return acc;
      },
      {
        totalDuration: 0,
        totalTokens: 0,
        totalLlmCalls: 0,
        totalToolCalls: 0,
        totalErrors: 0,
        totalSpans: 0,
      }
    );

    const traceCount = traces.length;
    const avgHealthScore =
      traceResults.reduce((sum, r) => sum + r.summary.overallHealthScore, 0) / traceCount;

    // Aggregate recommendations
    const recommendationCounts = new Map<string, number>();
    for (const result of traceResults) {
      for (const rec of result.summary.recommendations) {
        recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
      }
    }

    // Perform cross-trace pattern analysis
    let crossTraceAnalysis: CrossTraceAnalysisResult | undefined;
    if (enableCrossTraceAnalysis && traces.length >= 3) {
      // Create health score map from trace results
      const healthScores = new Map<string, number>();
      for (const result of traceResults) {
        healthScores.set(result.traceId, result.summary.overallHealthScore);
      }

      crossTraceAnalysis = crossTraceAnalyzer.analyzePatterns(traces, healthScores);

      // Add cross-trace recommendations to the pool
      for (const rec of crossTraceAnalysis.summary.topRecommendations) {
        recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 2); // Weight cross-trace recommendations higher
      }
    }

    const topRecommendations = Array.from(recommendationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rec]) => rec);

    return {
      traceResults,
      summary: {
        totalTracesAnalyzed: traceCount,
        avgHealthScore: Math.round(avgHealthScore * 100) / 100,
        commonPatterns: aggregatedPatterns.slice(0, 10).map((p) => ({
          type: p.type,
          frequency: p.frequency,
          avgSeverity: p.avgSeverity,
        })),
        commonIssues,
        aggregateMetrics: {
          avgDurationMs: Math.round(totalMetrics.totalDuration / traceCount),
          avgTokensPerTrace: Math.round(totalMetrics.totalTokens / traceCount),
          avgLlmCallsPerTrace: Math.round((totalMetrics.totalLlmCalls / traceCount) * 10) / 10,
          avgToolCallsPerTrace: Math.round((totalMetrics.totalToolCalls / traceCount) * 10) / 10,
          overallErrorRate:
            totalMetrics.totalSpans > 0
              ? Math.round((totalMetrics.totalErrors / totalMetrics.totalSpans) * 1000) / 1000
              : 0,
        },
        topRecommendations,
      },
      aggregatedPatterns,
      recommendations: topRecommendations,
      crossTraceAnalysis,
    };
  }

  /**
   * Gets the most common severity from an array.
   */
  function getMostCommonSeverity(severities: TraceIssueSeverity[]): TraceIssueSeverity {
    const counts = { critical: 0, warning: 0, info: 0 };
    severities.forEach((s) => counts[s]++);

    if (counts.critical > 0) return 'critical';
    if (counts.warning >= severities.length * 0.3) return 'warning';
    return 'info';
  }

  return {
    analyzeTrace,
    analyzeTraces,
    analyzeLatency,
    analyzeTools,
    analyzeLlmCalls,
    analyzeErrors,
    detectPatterns,
    // Cross-trace analysis functions
    analyzeCrossTracePatterns: crossTraceAnalyzer.analyzePatterns,
    detectCorrelations: crossTraceAnalyzer.detectCorrelations,
    clusterTraces: crossTraceAnalyzer.clusterTraces,
    detectAnomalies: crossTraceAnalyzer.detectAnomalies,
    detectTemporalPatterns: crossTraceAnalyzer.detectTemporalPatterns,
    detectBehavioralPatterns: crossTraceAnalyzer.detectBehavioralPatterns,
  };
}

/**
 * Type for the trace analysis engine instance.
 */
export type TraceAnalysisEngine = ReturnType<typeof createTraceAnalysisEngine>;
