/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Schema for trace span kinds used in analysis.
 */
export const traceSpanKindSchema = z.enum([
  'LLM',
  'INFERENCE',
  'TOOL',
  'AGENT',
  'CHAIN',
  'RETRIEVER',
  'EMBEDDING',
  'RERANKER',
  'OTHER',
]);

/**
 * Schema for trace span status codes.
 */
export const traceSpanStatusSchema = z.enum(['OK', 'ERROR', 'UNSET']);

/**
 * Schema for issue severity levels in trace analysis.
 */
export const traceIssueSeveritySchema = z.enum(['critical', 'warning', 'info']);

/**
 * Schema for trace pattern types that can be detected during analysis.
 */
export const tracePatternTypeSchema = z.enum([
  'excessive_llm_calls',
  'high_latency',
  'token_inefficiency',
  'tool_failures',
  'redundant_calls',
  'missing_context',
  'timeout_risk',
  'error_propagation',
  'sequential_bottleneck',
  'resource_contention',
]);

/**
 * Schema for a detected pattern in trace analysis.
 */
export const traceAnalysisPatternSchema = z.object({
  type: tracePatternTypeSchema.describe('The type of pattern detected.'),
  description: z.string().describe('Human-readable description of the pattern.'),
  severity: traceIssueSeveritySchema.describe('Severity level of this pattern.'),
  spanIds: z.array(z.string()).describe('Span IDs involved in this pattern.'),
  metrics: z
    .object({
      count: z.number().optional().describe('Number of occurrences.'),
      totalDurationMs: z.number().optional().describe('Total duration in milliseconds.'),
      avgDurationMs: z.number().optional().describe('Average duration in milliseconds.'),
      totalTokens: z.number().optional().describe('Total tokens involved.'),
      percentage: z.number().optional().describe('Percentage of total (0-100).'),
    })
    .optional()
    .describe('Quantitative metrics associated with this pattern.'),
  recommendation: z.string().optional().describe('Suggested action to address this pattern.'),
});

/**
 * Schema for a specific issue found in trace analysis.
 */
export const traceAnalysisIssueSchema = z.object({
  id: z.string().describe('Unique identifier for the issue.'),
  title: z.string().describe('Short descriptive title of the issue.'),
  description: z.string().describe('Detailed description of the issue found.'),
  severity: traceIssueSeveritySchema.describe('Severity level of the issue.'),
  spanId: z.string().optional().describe('Specific span ID where the issue was detected.'),
  spanName: z.string().optional().describe('Name of the span where the issue occurred.'),
  timestamp: z.string().optional().describe('Timestamp when the issue occurred.'),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional context about the issue.'),
  suggestedFix: z.string().optional().describe('Suggested fix for this issue.'),
});

/**
 * Schema for token usage analysis results.
 */
export const traceTokenAnalysisSchema = z.object({
  totalInputTokens: z.number().describe('Total input tokens across all LLM calls.'),
  totalOutputTokens: z.number().describe('Total output tokens across all LLM calls.'),
  totalCachedTokens: z.number().describe('Total cached tokens utilized.'),
  cacheHitRate: z.number().min(0).max(1).describe('Cache hit rate (0-1).'),
  avgTokensPerCall: z.number().describe('Average tokens per LLM call.'),
  tokenEfficiencyScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Token efficiency score (0-1, higher is better).'),
  costEstimate: z
    .object({
      inputCost: z.number().optional().describe('Estimated cost for input tokens.'),
      outputCost: z.number().optional().describe('Estimated cost for output tokens.'),
      totalCost: z.number().optional().describe('Total estimated cost.'),
      currency: z.string().optional().describe('Currency code (e.g., USD).'),
    })
    .optional()
    .describe('Cost estimation if pricing information is available.'),
});

/**
 * Schema for latency analysis results.
 */
export const traceLatencyAnalysisSchema = z.object({
  totalDurationMs: z.number().describe('Total trace duration in milliseconds.'),
  llmLatencyMs: z.number().describe('Total LLM inference latency in milliseconds.'),
  toolLatencyMs: z.number().describe('Total tool execution latency in milliseconds.'),
  overheadLatencyMs: z.number().describe('Non-LLM/tool overhead latency in milliseconds.'),
  llmLatencyPercentage: z.number().describe('Percentage of time spent in LLM calls.'),
  criticalPath: z
    .array(
      z.object({
        spanId: z.string().describe('Span ID on the critical path.'),
        spanName: z.string().describe('Span name.'),
        durationMs: z.number().describe('Duration in milliseconds.'),
        percentage: z.number().describe('Percentage of total duration.'),
      })
    )
    .describe('Spans on the critical path (longest sequence).'),
  bottlenecks: z
    .array(
      z.object({
        spanId: z.string().describe('Bottleneck span ID.'),
        spanName: z.string().describe('Span name.'),
        durationMs: z.number().describe('Duration in milliseconds.'),
        reason: z.string().describe('Why this is considered a bottleneck.'),
      })
    )
    .describe('Identified performance bottlenecks.'),
});

/**
 * Schema for tool usage analysis results.
 */
export const traceToolAnalysisSchema = z.object({
  totalToolCalls: z.number().describe('Total number of tool calls.'),
  uniqueToolsUsed: z.array(z.string()).describe('List of unique tools used.'),
  toolCallsByName: z.record(z.string(), z.number()).describe('Count of calls per tool name.'),
  failedToolCalls: z.number().describe('Number of failed tool calls.'),
  toolFailureRate: z.number().min(0).max(1).describe('Tool failure rate (0-1).'),
  avgToolLatencyMs: z.number().describe('Average tool execution latency in milliseconds.'),
  toolLatencyByName: z
    .record(z.string(), z.number())
    .describe('Average latency per tool in milliseconds.'),
  redundantCalls: z
    .array(
      z.object({
        toolName: z.string().describe('Name of the tool.'),
        count: z.number().describe('Number of potentially redundant calls.'),
        spanIds: z.array(z.string()).describe('Span IDs of redundant calls.'),
      })
    )
    .optional()
    .describe('Potentially redundant tool calls detected.'),
});

/**
 * Schema for LLM call analysis results.
 */
export const traceLlmCallAnalysisSchema = z.object({
  totalLlmCalls: z.number().describe('Total number of LLM calls.'),
  modelsUsed: z.array(z.string()).describe('List of models used.'),
  avgCallDurationMs: z.number().describe('Average LLM call duration in milliseconds.'),
  maxCallDurationMs: z.number().describe('Maximum LLM call duration in milliseconds.'),
  callsByModel: z.record(z.string(), z.number()).describe('Count of calls per model.'),
  tokensByModel: z
    .record(
      z.string(),
      z.object({
        input: z.number().describe('Input tokens for this model.'),
        output: z.number().describe('Output tokens for this model.'),
      })
    )
    .describe('Token usage per model.'),
  sequentialCallsCount: z
    .number()
    .optional()
    .describe('Number of sequential (non-parallel) LLM call chains.'),
});

/**
 * Schema for error analysis results.
 */
export const traceErrorAnalysisSchema = z.object({
  totalErrors: z.number().describe('Total number of error spans.'),
  errorRate: z.number().min(0).max(1).describe('Error rate (0-1).'),
  errorsByType: z
    .record(z.string(), z.number())
    .describe('Count of errors by error type/category.'),
  errorSpans: z
    .array(
      z.object({
        spanId: z.string().describe('Error span ID.'),
        spanName: z.string().describe('Span name.'),
        errorMessage: z.string().optional().describe('Error message if available.'),
        errorType: z.string().optional().describe('Error type/category.'),
        timestamp: z.string().describe('When the error occurred.'),
        isRecovered: z.boolean().optional().describe('Whether the error was recovered from.'),
      })
    )
    .describe('Details of error spans.'),
  errorPropagation: z
    .array(
      z.object({
        sourceSpanId: z.string().describe('Original error span ID.'),
        affectedSpanIds: z.array(z.string()).describe('Span IDs affected by the error.'),
        propagationDepth: z.number().describe('How many levels the error propagated.'),
      })
    )
    .optional()
    .describe('Error propagation chains detected.'),
});

/**
 * Schema for the complete trace analysis result.
 */
export const traceAnalysisResultSchema = z.object({
  traceId: z.string().describe('ID of the analyzed trace.'),
  analyzedAt: z.string().describe('Timestamp when the analysis was performed.'),
  summary: z.object({
    overallHealthScore: z
      .number()
      .min(0)
      .max(1)
      .describe('Overall health score (0-1, higher is better).'),
    totalSpans: z.number().describe('Total number of spans in the trace.'),
    totalDurationMs: z.number().describe('Total trace duration in milliseconds.'),
    primaryIssues: z.array(z.string()).describe('List of primary issues identified.'),
    recommendations: z.array(z.string()).describe('Top recommendations for improvement.'),
  }),
  tokenAnalysis: traceTokenAnalysisSchema.optional().describe('Token usage analysis.'),
  latencyAnalysis: traceLatencyAnalysisSchema.optional().describe('Latency analysis.'),
  toolAnalysis: traceToolAnalysisSchema.optional().describe('Tool usage analysis.'),
  llmCallAnalysis: traceLlmCallAnalysisSchema.optional().describe('LLM call analysis.'),
  errorAnalysis: traceErrorAnalysisSchema.optional().describe('Error analysis.'),
  detectedPatterns: z.array(traceAnalysisPatternSchema).describe('Patterns detected in the trace.'),
  issues: z.array(traceAnalysisIssueSchema).describe('Specific issues found.'),
});

/**
 * Schema for trace analysis input configuration.
 */
export const traceAnalysisInputSchema = z.object({
  traceId: z.string().describe('ID of the trace to analyze.'),
  spans: z.string().describe('JSON string of trace spans.'),
  spanCount: z.number().describe('Number of spans in the trace.'),
  totalDurationMs: z.number().describe('Total trace duration in milliseconds.'),
  rootOperation: z.string().optional().describe('Root operation name.'),
  focusAreas: z
    .array(z.enum(['tokens', 'latency', 'tools', 'errors', 'patterns']))
    .optional()
    .describe('Specific areas to focus the analysis on.'),
  thresholds: z
    .object({
      maxLatencyMs: z.number().optional().describe('Maximum acceptable latency threshold.'),
      maxTokensPerCall: z.number().optional().describe('Maximum tokens per LLM call threshold.'),
      maxToolFailureRate: z.number().optional().describe('Maximum acceptable tool failure rate.'),
      maxLlmCalls: z.number().optional().describe('Maximum acceptable LLM calls.'),
    })
    .optional()
    .describe('Custom thresholds for analysis.'),
  additionalContext: z.string().optional().describe('Additional context for the analysis.'),
});

/**
 * Schema for LLM response when analyzing a trace.
 * This is a simplified schema for direct LLM output.
 */
export const llmTraceAnalysisResponseSchema = z.object({
  overallAssessment: z.string().describe('Overall assessment of the trace health.'),
  healthScore: z.number().min(0).max(1).describe('Overall health score (0-1, higher is better).'),
  patterns: z
    .array(
      z.object({
        type: tracePatternTypeSchema.describe('Pattern type.'),
        description: z.string().describe('Description of the pattern.'),
        severity: traceIssueSeveritySchema.describe('Severity level.'),
        affectedSpans: z.array(z.string()).optional().describe('Affected span names.'),
        recommendation: z.string().optional().describe('Recommendation.'),
      })
    )
    .describe('Patterns detected in the trace.'),
  issues: z
    .array(
      z.object({
        title: z.string().describe('Issue title.'),
        description: z.string().describe('Issue description.'),
        severity: traceIssueSeveritySchema.describe('Issue severity.'),
        spanName: z.string().optional().describe('Related span name.'),
        suggestedFix: z.string().optional().describe('Suggested fix.'),
      })
    )
    .describe('Issues found in the trace.'),
  recommendations: z.array(z.string()).describe('Prioritized list of improvement recommendations.'),
  tokenInsights: z
    .object({
      assessment: z.string().describe('Assessment of token usage.'),
      inefficiencies: z.array(z.string()).optional().describe('Token inefficiencies found.'),
      suggestions: z.array(z.string()).optional().describe('Token optimization suggestions.'),
    })
    .optional()
    .describe('Token usage insights.'),
  latencyInsights: z
    .object({
      assessment: z.string().describe('Assessment of latency.'),
      bottlenecks: z.array(z.string()).optional().describe('Bottlenecks identified.'),
      suggestions: z.array(z.string()).optional().describe('Latency optimization suggestions.'),
    })
    .optional()
    .describe('Latency insights.'),
});

/**
 * Schema for batch trace analysis input.
 */
export const batchTraceAnalysisInputSchema = z.object({
  traceIds: z.array(z.string()).describe('List of trace IDs to analyze.'),
  commonContext: z.string().optional().describe('Context shared across all traces.'),
  compareMode: z.boolean().optional().describe('Whether to compare traces against each other.'),
  aggregateResults: z.boolean().optional().describe('Whether to aggregate results across traces.'),
});

/**
 * Schema for batch trace analysis summary.
 */
export const batchTraceAnalysisSummarySchema = z.object({
  totalTracesAnalyzed: z.number().describe('Total number of traces analyzed.'),
  avgHealthScore: z.number().min(0).max(1).describe('Average health score across traces.'),
  commonPatterns: z
    .array(
      z.object({
        type: tracePatternTypeSchema.describe('Pattern type.'),
        frequency: z.number().describe('How many traces exhibited this pattern.'),
        avgSeverity: traceIssueSeveritySchema.describe('Most common severity.'),
      })
    )
    .describe('Patterns common across multiple traces.'),
  commonIssues: z
    .array(
      z.object({
        title: z.string().describe('Issue title.'),
        frequency: z.number().describe('How many traces had this issue.'),
        severity: traceIssueSeveritySchema.describe('Most common severity.'),
      })
    )
    .describe('Issues common across multiple traces.'),
  aggregateMetrics: z
    .object({
      avgDurationMs: z.number().describe('Average trace duration.'),
      avgTokensPerTrace: z.number().describe('Average tokens per trace.'),
      avgLlmCallsPerTrace: z.number().describe('Average LLM calls per trace.'),
      avgToolCallsPerTrace: z.number().describe('Average tool calls per trace.'),
      overallErrorRate: z.number().describe('Overall error rate across traces.'),
    })
    .describe('Aggregated metrics across all traces.'),
  topRecommendations: z
    .array(z.string())
    .describe('Top recommendations based on aggregate analysis.'),
});

// ============================================================================
// Cross-Trace Pattern Analysis Schemas
// ============================================================================

/**
 * Schema for cross-trace pattern types.
 */
export const crossTracePatternTypeSchema = z.enum([
  'metric_correlation',
  'temporal_degradation',
  'temporal_improvement',
  'common_tool_sequence',
  'error_prone_combination',
  'low_health_cluster',
  'performance_outlier',
  'resource_outlier',
]);

/**
 * Schema for a cross-trace pattern detected across multiple traces.
 */
export const crossTracePatternSchema = z.object({
  type: z
    .union([crossTracePatternTypeSchema, z.string()])
    .describe('The type of cross-trace pattern detected.'),
  description: z.string().describe('Human-readable description of the pattern.'),
  severity: traceIssueSeveritySchema.describe('Severity level of this pattern.'),
  affectedTraceIds: z.array(z.string()).describe('Trace IDs affected by this pattern.'),
  metrics: z
    .record(z.string(), z.union([z.number(), z.string()]))
    .optional()
    .describe('Quantitative metrics associated with this pattern.'),
  recommendation: z.string().optional().describe('Suggested action to address this pattern.'),
});

/**
 * Schema for trace clustering results.
 */
export const traceClusterSchema = z.object({
  clusterId: z.string().describe('Unique identifier for the cluster.'),
  traceIds: z.array(z.string()).describe('Trace IDs in this cluster.'),
  size: z.number().describe('Number of traces in the cluster.'),
  centroidFeatures: z
    .record(z.string(), z.number())
    .describe('Feature values at the cluster centroid.'),
  characteristics: z.array(z.string()).describe('Human-readable characteristics of this cluster.'),
  avgHealthScore: z.number().optional().describe('Average health score of traces in this cluster.'),
  avgDurationMs: z.number().describe('Average duration of traces in this cluster.'),
});

/**
 * Schema for trace anomaly detection results.
 */
export const traceAnomalySchema = z.object({
  traceId: z.string().describe('ID of the anomalous trace.'),
  anomalyType: z
    .enum(['performance', 'resource', 'error', 'behavioral'])
    .describe('Type of anomaly detected.'),
  severity: traceIssueSeveritySchema.describe('Severity of the anomaly.'),
  anomalousFeatures: z
    .array(
      z.object({
        feature: z.string().describe('Name of the anomalous feature.'),
        zScore: z.number().describe('Z-score indicating how far from normal.'),
        value: z.number().describe('Actual value of the feature.'),
      })
    )
    .describe('Features that are anomalous.'),
  description: z.string().describe('Human-readable description of the anomaly.'),
  recommendation: z.string().optional().describe('Suggested action to address the anomaly.'),
});

/**
 * Schema for cross-trace correlation results.
 */
export const crossTraceCorrelationSchema = z.object({
  metric1: z.string().describe('First metric in the correlation.'),
  metric2: z.string().describe('Second metric in the correlation.'),
  correlationCoefficient: z
    .number()
    .min(-1)
    .max(1)
    .describe('Pearson correlation coefficient (-1 to 1).'),
  direction: z.enum(['positive', 'negative', 'none']).describe('Direction of correlation.'),
  sampleSize: z.number().describe('Number of traces used to calculate correlation.'),
  significance: z
    .enum(['high', 'medium', 'low'])
    .describe('Statistical significance of correlation.'),
  affectedTraceIds: z
    .array(z.string())
    .optional()
    .describe('Trace IDs most affected by this correlation.'),
});

/**
 * Schema for the complete cross-trace analysis result.
 */
export const crossTraceAnalysisResultSchema = z.object({
  analyzedAt: z.string().describe('Timestamp when the analysis was performed.'),
  traceCount: z.number().describe('Total number of traces analyzed.'),
  patterns: z.array(crossTracePatternSchema).describe('Cross-trace patterns detected.'),
  correlations: z.array(crossTraceCorrelationSchema).describe('Metric correlations found.'),
  clusters: z.array(traceClusterSchema).describe('Trace clusters identified.'),
  anomalies: z.array(traceAnomalySchema).describe('Anomalous traces detected.'),
  summary: z.object({
    totalPatternsDetected: z.number().describe('Total number of patterns detected.'),
    criticalPatterns: z.number().describe('Number of critical severity patterns.'),
    warningPatterns: z.number().describe('Number of warning severity patterns.'),
    infoPatterns: z.number().describe('Number of info severity patterns.'),
    topRecommendations: z.array(z.string()).describe('Top recommendations based on analysis.'),
  }),
});

/**
 * Type inference helpers
 */
export type TraceSpanKind = z.infer<typeof traceSpanKindSchema>;
export type TraceSpanStatus = z.infer<typeof traceSpanStatusSchema>;
export type TraceIssueSeverity = z.infer<typeof traceIssueSeveritySchema>;
export type TracePatternType = z.infer<typeof tracePatternTypeSchema>;
export type TraceAnalysisPattern = z.infer<typeof traceAnalysisPatternSchema>;
export type TraceAnalysisIssue = z.infer<typeof traceAnalysisIssueSchema>;
export type TraceTokenAnalysis = z.infer<typeof traceTokenAnalysisSchema>;
export type TraceLatencyAnalysis = z.infer<typeof traceLatencyAnalysisSchema>;
export type TraceToolAnalysis = z.infer<typeof traceToolAnalysisSchema>;
export type TraceLlmCallAnalysis = z.infer<typeof traceLlmCallAnalysisSchema>;
export type TraceErrorAnalysis = z.infer<typeof traceErrorAnalysisSchema>;
export type TraceAnalysisResult = z.infer<typeof traceAnalysisResultSchema>;
export type TraceAnalysisInput = z.infer<typeof traceAnalysisInputSchema>;
export type LlmTraceAnalysisResponse = z.infer<typeof llmTraceAnalysisResponseSchema>;
export type BatchTraceAnalysisInput = z.infer<typeof batchTraceAnalysisInputSchema>;
export type BatchTraceAnalysisSummary = z.infer<typeof batchTraceAnalysisSummarySchema>;

// Cross-trace pattern analysis types
export type CrossTracePatternType = z.infer<typeof crossTracePatternTypeSchema>;
export type CrossTracePattern = z.infer<typeof crossTracePatternSchema>;
export type TraceCluster = z.infer<typeof traceClusterSchema>;
export type TraceAnomaly = z.infer<typeof traceAnomalySchema>;
export type CrossTraceCorrelation = z.infer<typeof crossTraceCorrelationSchema>;
export type CrossTraceAnalysisResult = z.infer<typeof crossTraceAnalysisResultSchema>;
