/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreprocessedTrace, NormalizedSpan, TraceMetrics } from './trace_preprocessor';
import type {
  TraceTokenAnalysis,
  TraceAnalysisPattern,
  TraceIssueSeverity,
} from './analysis_schemas';
import type { ImprovementSuggestion } from '../../types';

/**
 * Configuration for the token efficiency analyzer.
 */
export interface TokenEfficiencyAnalyzerConfig {
  /**
   * Threshold for token efficiency score below which issues are flagged.
   * Default: 0.7 (70% efficiency)
   */
  efficiencyThreshold?: number;
  /**
   * Threshold for cache hit rate below which caching improvements are suggested.
   * Default: 0.3 (30% cache hits)
   */
  cacheHitThreshold?: number;
  /**
   * Maximum tokens per LLM call before flagging as potentially excessive.
   * Default: 8000
   */
  maxTokensPerCall?: number;
  /**
   * Maximum total tokens per trace before flagging as potentially excessive.
   * Default: 50000
   */
  maxTotalTokensPerTrace?: number;
  /**
   * Minimum output-to-input token ratio for flagging verbose outputs.
   * Default: 0.5 (output tokens > 50% of input tokens)
   */
  verboseOutputThreshold?: number;
  /**
   * Pricing per 1K input tokens (for cost estimation).
   * Default: 0.003 (approximate Claude/GPT-4 pricing)
   */
  inputTokenPricePer1K?: number;
  /**
   * Pricing per 1K output tokens (for cost estimation).
   * Default: 0.015 (approximate Claude/GPT-4 pricing)
   */
  outputTokenPricePer1K?: number;
  /**
   * Currency for cost estimation.
   * Default: 'USD'
   */
  currency?: string;
}

/**
 * Result from analyzing token efficiency for a single trace.
 */
export interface TokenEfficiencyResult {
  /** Trace ID that was analyzed */
  traceId: string;
  /** Detailed token analysis metrics */
  tokenAnalysis: TraceTokenAnalysis;
  /** Detected inefficiency patterns */
  patterns: TraceAnalysisPattern[];
  /** Generated improvement suggestions */
  suggestions: ImprovementSuggestion[];
  /** Overall assessment of token efficiency */
  assessment: {
    /** Overall efficiency rating */
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    /** Human-readable summary */
    summary: string;
    /** Key improvement opportunities */
    opportunities: string[];
  };
}

/**
 * Aggregated result from analyzing multiple traces.
 */
export interface AggregatedTokenEfficiencyResult {
  /** Number of traces analyzed */
  traceCount: number;
  /** Average metrics across all traces */
  averageMetrics: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    efficiencyScore: number;
    cacheHitRate: number;
    tokensPerLlmCall: number;
  };
  /** Total metrics across all traces */
  totalMetrics: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    estimatedCost: number;
  };
  /** Common patterns across traces */
  commonPatterns: Array<{
    type: string;
    frequency: number;
    avgSeverity: TraceIssueSeverity;
  }>;
  /** Aggregated suggestions sorted by priority */
  prioritizedSuggestions: ImprovementSuggestion[];
  /** Per-trace results */
  traceResults: TokenEfficiencyResult[];
}

/**
 * Internal representation of per-span token data.
 */
interface SpanTokenData {
  spanId: string;
  spanName: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  model?: string;
  durationMs: number;
}

/**
 * Creates a token efficiency analyzer with the given configuration.
 *
 * @param config - Configuration options for the analyzer
 * @returns Token efficiency analyzer functions
 *
 * @example
 * ```typescript
 * const analyzer = createTokenEfficiencyAnalyzer({
 *   efficiencyThreshold: 0.7,
 *   maxTokensPerCall: 8000,
 * });
 *
 * const result = analyzer.analyzeTrace(preprocessedTrace);
 * console.log(`Efficiency score: ${result.tokenAnalysis.tokenEfficiencyScore}`);
 *
 * // Analyze multiple traces
 * const aggregated = analyzer.analyzeTraces(traces);
 * console.log(`Average efficiency: ${aggregated.averageMetrics.efficiencyScore}`);
 * ```
 */
export function createTokenEfficiencyAnalyzer(config: TokenEfficiencyAnalyzerConfig = {}) {
  const {
    efficiencyThreshold = 0.7,
    cacheHitThreshold = 0.3,
    maxTokensPerCall = 8000,
    maxTotalTokensPerTrace = 50000,
    verboseOutputThreshold = 0.5,
    inputTokenPricePer1K = 0.003,
    outputTokenPricePer1K = 0.015,
    currency = 'USD',
  } = config;

  let suggestionCounter = 0;

  /**
   * Generates a unique suggestion ID.
   */
  function generateSuggestionId(): string {
    const timestamp = Date.now().toString(36);
    return `token-eff-${timestamp}-${suggestionCounter++}`;
  }

  /**
   * Extracts token data from LLM spans.
   */
  function extractSpanTokenData(spans: NormalizedSpan[]): SpanTokenData[] {
    return spans
      .filter((span) => span.kind === 'LLM' || span.kind === 'INFERENCE')
      .filter((span) => span.tokens && (span.tokens.input || span.tokens.output))
      .map((span) => ({
        spanId: span.spanId,
        spanName: span.name,
        inputTokens: span.tokens?.input || 0,
        outputTokens: span.tokens?.output || 0,
        cachedTokens: span.tokens?.cached || 0,
        totalTokens: (span.tokens?.input || 0) + (span.tokens?.output || 0),
        model: span.model?.used || span.model?.requested,
        durationMs: span.durationMs,
      }));
  }

  /**
   * Calculates the token efficiency score.
   * Higher scores indicate better efficiency.
   */
  function calculateEfficiencyScore(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number,
    llmCallCount: number
  ): number {
    if (inputTokens + outputTokens === 0) {
      return 1; // No tokens used = perfect efficiency (trivial case)
    }

    const totalTokens = inputTokens + outputTokens;
    const effectiveTokens = totalTokens - cachedTokens;

    // Factor 1: Cache utilization (0-0.3)
    const cacheUtilization = inputTokens > 0 ? Math.min(cachedTokens / inputTokens, 1) * 0.3 : 0;

    // Factor 2: Output-to-input ratio (0-0.3)
    // Lower ratios are better (concise responses)
    const outputRatio = inputTokens > 0 ? outputTokens / inputTokens : 1;
    const outputEfficiency = Math.max(0, 0.3 * (1 - Math.min(outputRatio, 2) / 2));

    // Factor 3: Tokens per call (0-0.2)
    // Fewer tokens per call is generally better
    const avgTokensPerCall = llmCallCount > 0 ? totalTokens / llmCallCount : totalTokens;
    const callEfficiency = Math.max(
      0,
      0.2 * (1 - Math.min(avgTokensPerCall / maxTokensPerCall, 1))
    );

    // Factor 4: Base efficiency from effective token count (0-0.2)
    const baseEfficiency = Math.max(
      0,
      0.2 * (1 - Math.min(effectiveTokens / maxTotalTokensPerTrace, 1))
    );

    return Math.min(1, cacheUtilization + outputEfficiency + callEfficiency + baseEfficiency + 0.3);
  }

  /**
   * Estimates cost based on token usage.
   */
  function estimateCost(
    inputTokens: number,
    outputTokens: number
  ): { inputCost: number; outputCost: number; totalCost: number; currency: string } {
    const inputCost = (inputTokens / 1000) * inputTokenPricePer1K;
    const outputCost = (outputTokens / 1000) * outputTokenPricePer1K;

    return {
      inputCost: Math.round(inputCost * 10000) / 10000,
      outputCost: Math.round(outputCost * 10000) / 10000,
      totalCost: Math.round((inputCost + outputCost) * 10000) / 10000,
      currency,
    };
  }

  /**
   * Analyzes token usage and produces detailed analysis.
   */
  function analyzeTokenUsage(metrics: TraceMetrics, spanData: SpanTokenData[]): TraceTokenAnalysis {
    const { input, output, cached } = metrics.tokens;
    const llmCallCount = spanData.length;

    const cacheHitRate = input > 0 ? cached / input : 0;
    const avgTokensPerCall = llmCallCount > 0 ? (input + output) / llmCallCount : 0;
    const efficiencyScore = calculateEfficiencyScore(input, output, cached, llmCallCount);
    const costEstimate = estimateCost(input, output);

    return {
      totalInputTokens: input,
      totalOutputTokens: output,
      totalCachedTokens: cached,
      cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
      avgTokensPerCall: Math.round(avgTokensPerCall),
      tokenEfficiencyScore: Math.round(efficiencyScore * 1000) / 1000,
      costEstimate,
    };
  }

  /**
   * Detects token inefficiency patterns in the trace.
   */
  function detectPatterns(
    tokenAnalysis: TraceTokenAnalysis,
    spanData: SpanTokenData[],
    traceMetrics: TraceMetrics
  ): TraceAnalysisPattern[] {
    const patterns: TraceAnalysisPattern[] = [];

    // Pattern 1: Low cache utilization
    if (tokenAnalysis.cacheHitRate < cacheHitThreshold && tokenAnalysis.totalInputTokens > 1000) {
      patterns.push({
        type: 'token_inefficiency',
        description: `Low cache hit rate (${(tokenAnalysis.cacheHitRate * 100).toFixed(
          1
        )}%) indicates potential for prompt caching optimization.`,
        severity: tokenAnalysis.cacheHitRate < 0.1 ? 'warning' : 'info',
        spanIds: spanData.map((s) => s.spanId),
        metrics: {
          percentage: tokenAnalysis.cacheHitRate * 100,
          totalTokens: tokenAnalysis.totalInputTokens,
        },
        recommendation:
          'Consider restructuring prompts to maximize cache hits by placing static content at the beginning.',
      });
    }

    // Pattern 2: Excessive tokens per call
    const highTokenCalls = spanData.filter((s) => s.totalTokens > maxTokensPerCall);
    if (highTokenCalls.length > 0) {
      const totalExcessiveTokens = highTokenCalls.reduce((sum, s) => sum + s.totalTokens, 0);
      patterns.push({
        type: 'token_inefficiency',
        description: `${highTokenCalls.length} LLM call(s) exceeded ${maxTokensPerCall} tokens, totaling ${totalExcessiveTokens} tokens.`,
        severity: highTokenCalls.length > 2 ? 'warning' : 'info',
        spanIds: highTokenCalls.map((s) => s.spanId),
        metrics: {
          count: highTokenCalls.length,
          totalTokens: totalExcessiveTokens,
          avgDurationMs:
            highTokenCalls.reduce((sum, s) => sum + s.durationMs, 0) / highTokenCalls.length,
        },
        recommendation:
          'Consider breaking large prompts into smaller, focused queries or using document summarization.',
      });
    }

    // Pattern 3: Verbose outputs
    const verboseOutputCalls = spanData.filter(
      (s) => s.inputTokens > 0 && s.outputTokens / s.inputTokens > verboseOutputThreshold
    );
    if (verboseOutputCalls.length > 0) {
      const avgOutputRatio =
        verboseOutputCalls.reduce((sum, s) => sum + s.outputTokens / s.inputTokens, 0) /
        verboseOutputCalls.length;

      patterns.push({
        type: 'token_inefficiency',
        description: `${verboseOutputCalls.length} LLM call(s) produced verbose outputs (avg ${(
          avgOutputRatio * 100
        ).toFixed(1)}% of input size).`,
        severity: avgOutputRatio > 1 ? 'warning' : 'info',
        spanIds: verboseOutputCalls.map((s) => s.spanId),
        metrics: {
          count: verboseOutputCalls.length,
          percentage: avgOutputRatio * 100,
        },
        recommendation:
          'Add explicit length constraints to prompts or use response formatting guidelines.',
      });
    }

    // Pattern 4: High total token usage
    const totalTokens = tokenAnalysis.totalInputTokens + tokenAnalysis.totalOutputTokens;
    if (totalTokens > maxTotalTokensPerTrace) {
      patterns.push({
        type: 'token_inefficiency',
        description: `Total token usage (${totalTokens}) exceeds recommended limit of ${maxTotalTokensPerTrace}.`,
        severity: totalTokens > maxTotalTokensPerTrace * 1.5 ? 'critical' : 'warning',
        spanIds: spanData.map((s) => s.spanId),
        metrics: {
          totalTokens,
          percentage: (totalTokens / maxTotalTokensPerTrace) * 100,
        },
        recommendation:
          'Review the conversation flow for opportunities to reduce context size or implement summarization.',
      });
    }

    // Pattern 5: Redundant LLM calls (multiple calls with similar token counts)
    if (spanData.length > 2) {
      const tokenCounts = spanData.map((s) => s.totalTokens);
      const avgTokens = tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length;
      const similarCalls = spanData.filter(
        (s) => Math.abs(s.totalTokens - avgTokens) < avgTokens * 0.1
      );

      if (similarCalls.length >= 3 && similarCalls.length >= spanData.length * 0.7) {
        patterns.push({
          type: 'redundant_calls',
          description: `${similarCalls.length} LLM calls have similar token counts, suggesting potential for batching or deduplication.`,
          severity: 'info',
          spanIds: similarCalls.map((s) => s.spanId),
          metrics: {
            count: similarCalls.length,
            avgDurationMs:
              similarCalls.reduce((sum, s) => sum + s.durationMs, 0) / similarCalls.length,
          },
          recommendation:
            'Consider batching similar requests or caching responses for repeated queries.',
        });
      }
    }

    // Pattern 6: Low efficiency score
    if (tokenAnalysis.tokenEfficiencyScore < efficiencyThreshold) {
      patterns.push({
        type: 'token_inefficiency',
        description: `Overall token efficiency score (${(
          tokenAnalysis.tokenEfficiencyScore * 100
        ).toFixed(1)}%) is below the ${(efficiencyThreshold * 100).toFixed(0)}% threshold.`,
        severity:
          tokenAnalysis.tokenEfficiencyScore < efficiencyThreshold * 0.7 ? 'warning' : 'info',
        spanIds: spanData.map((s) => s.spanId),
        metrics: {
          percentage: tokenAnalysis.tokenEfficiencyScore * 100,
        },
        recommendation:
          'Review token usage patterns and implement the suggested optimizations to improve efficiency.',
      });
    }

    return patterns;
  }

  /**
   * Generates improvement suggestions from detected patterns.
   */
  function generateSuggestions(
    traceId: string,
    tokenAnalysis: TraceTokenAnalysis,
    patterns: TraceAnalysisPattern[],
    spanData: SpanTokenData[]
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Suggestion 1: Improve cache utilization
    if (tokenAnalysis.cacheHitRate < cacheHitThreshold && tokenAnalysis.totalInputTokens > 1000) {
      const potentialSavings =
        tokenAnalysis.totalInputTokens * (cacheHitThreshold - tokenAnalysis.cacheHitRate);
      const costSavings = (potentialSavings / 1000) * inputTokenPricePer1K;

      suggestions.push({
        id: generateSuggestionId(),
        title: 'Improve prompt caching utilization',
        description:
          `Current cache hit rate is ${(tokenAnalysis.cacheHitRate * 100).toFixed(1)}%. ` +
          `Optimizing prompt structure could save approximately ${Math.round(
            potentialSavings
          )} tokens ` +
          `(~${currency} ${costSavings.toFixed(4)}) per trace.`,
        category: 'efficiency',
        impact: costSavings > 0.01 ? 'high' : 'medium',
        confidence: 'high',
        evidence: [
          {
            evaluatorName: 'TokenEfficiencyAnalyzer',
            exampleIndices: [0],
            score: tokenAnalysis.cacheHitRate,
            explanation: `Cache hit rate: ${(tokenAnalysis.cacheHitRate * 100).toFixed(1)}%`,
            details: { traceId, potentialSavings, costSavings },
          },
        ],
        actionItems: [
          'Move static system prompts and instructions to the beginning of the prompt',
          'Use consistent formatting for repeated context sections',
          'Consider implementing prompt templates with cacheable prefixes',
          'Review LLM provider documentation for prompt caching best practices',
        ],
        priorityScore: calculatePriority(
          'efficiency',
          costSavings > 0.01 ? 'high' : 'medium',
          'high'
        ),
        tags: ['caching', 'cost-optimization', 'tokens'],
      });
    }

    // Suggestion 2: Reduce token-heavy calls
    const highTokenCalls = spanData.filter((s) => s.totalTokens > maxTokensPerCall);
    if (highTokenCalls.length > 0) {
      const excessTokens = highTokenCalls.reduce(
        (sum, s) => sum + (s.totalTokens - maxTokensPerCall),
        0
      );

      suggestions.push({
        id: generateSuggestionId(),
        title: 'Optimize high-token LLM calls',
        description:
          `${highTokenCalls.length} LLM call(s) use excessive tokens. ` +
          `Optimizing these calls could reduce token usage by ~${Math.round(excessTokens)} tokens.`,
        category: 'efficiency',
        impact: highTokenCalls.length > 2 ? 'high' : 'medium',
        confidence: 'high',
        evidence: highTokenCalls.map((call) => ({
          evaluatorName: 'TokenEfficiencyAnalyzer',
          exampleIndices: [0],
          score: maxTokensPerCall / call.totalTokens,
          explanation: `${call.spanName}: ${call.totalTokens} tokens (limit: ${maxTokensPerCall})`,
          details: { spanId: call.spanId, model: call.model },
        })),
        actionItems: [
          'Break large prompts into smaller, focused queries',
          'Implement context summarization for long documents',
          'Use retrieval-augmented generation to fetch only relevant context',
          'Consider chunking strategies for large input data',
        ],
        priorityScore: calculatePriority(
          'efficiency',
          highTokenCalls.length > 2 ? 'high' : 'medium',
          'high'
        ),
        tags: ['context-size', 'prompt-optimization', 'tokens'],
      });
    }

    // Suggestion 3: Address verbose outputs
    const verboseOutputPatterns = patterns.filter(
      (p) => p.type === 'token_inefficiency' && p.description.includes('verbose')
    );
    if (verboseOutputPatterns.length > 0) {
      suggestions.push({
        id: generateSuggestionId(),
        title: 'Control response verbosity',
        description:
          'LLM responses are producing more tokens than expected relative to input size. ' +
          'Adding explicit constraints can reduce output tokens and costs.',
        category: 'efficiency',
        impact: 'medium',
        confidence: 'medium',
        evidence: [
          {
            evaluatorName: 'TokenEfficiencyAnalyzer',
            exampleIndices: [0],
            explanation: verboseOutputPatterns[0].description,
            details: { traceId },
          },
        ],
        actionItems: [
          'Add explicit length constraints (e.g., "Respond in 2-3 sentences")',
          'Use structured output formats (JSON, bullet points) to encourage conciseness',
          'Specify the desired response format in the system prompt',
          'Consider using max_tokens parameter to hard-limit responses',
        ],
        priorityScore: calculatePriority('efficiency', 'medium', 'medium'),
        tags: ['response-length', 'output-tokens', 'prompt-engineering'],
      });
    }

    // Suggestion 4: Overall efficiency improvement
    if (tokenAnalysis.tokenEfficiencyScore < efficiencyThreshold) {
      const currentCost = tokenAnalysis.costEstimate?.totalCost || 0;
      const potentialCost = currentCost * tokenAnalysis.tokenEfficiencyScore;
      const potentialSavings = currentCost - potentialCost;

      suggestions.push({
        id: generateSuggestionId(),
        title: 'Comprehensive token efficiency review',
        description:
          `Overall token efficiency score is ${(tokenAnalysis.tokenEfficiencyScore * 100).toFixed(
            1
          )}%. ` +
          `A comprehensive review could improve efficiency and reduce costs by ~${currency} ${potentialSavings.toFixed(
            4
          )} per trace.`,
        category: 'efficiency',
        impact: tokenAnalysis.tokenEfficiencyScore < efficiencyThreshold * 0.7 ? 'high' : 'medium',
        confidence: 'high',
        evidence: [
          {
            evaluatorName: 'TokenEfficiencyAnalyzer',
            exampleIndices: [0],
            score: tokenAnalysis.tokenEfficiencyScore,
            explanation: `Efficiency score: ${(tokenAnalysis.tokenEfficiencyScore * 100).toFixed(
              1
            )}%`,
            details: {
              traceId,
              inputTokens: tokenAnalysis.totalInputTokens,
              outputTokens: tokenAnalysis.totalOutputTokens,
              cachedTokens: tokenAnalysis.totalCachedTokens,
            },
          },
        ],
        actionItems: [
          'Audit all prompts for unnecessary context or redundant instructions',
          'Implement prompt compression techniques for long contexts',
          'Consider model cascading (use smaller models for simpler tasks)',
          'Review and optimize the conversation flow to minimize round-trips',
          'Set up monitoring to track token efficiency metrics over time',
        ],
        priorityScore: calculatePriority(
          'efficiency',
          tokenAnalysis.tokenEfficiencyScore < efficiencyThreshold * 0.7 ? 'high' : 'medium',
          'high'
        ),
        tags: ['comprehensive', 'cost-optimization', 'efficiency-audit'],
      });
    }

    return suggestions.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  /**
   * Calculates priority score for a suggestion.
   */
  function calculatePriority(
    category: string,
    impact: 'high' | 'medium' | 'low',
    confidence: 'high' | 'medium' | 'low'
  ): number {
    const impactScores = { high: 1.0, medium: 0.6, low: 0.3 };
    const confidenceScores = { high: 1.0, medium: 0.7, low: 0.4 };
    const categoryBonus = category === 'efficiency' ? 0.1 : 0;

    return Math.min(
      1,
      impactScores[impact] * 0.5 + confidenceScores[confidence] * 0.3 + categoryBonus + 0.1
    );
  }

  /**
   * Generates an assessment summary.
   */
  function generateAssessment(
    tokenAnalysis: TraceTokenAnalysis,
    patterns: TraceAnalysisPattern[]
  ): TokenEfficiencyResult['assessment'] {
    const score = tokenAnalysis.tokenEfficiencyScore;

    let rating: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 0.85) {
      rating = 'excellent';
    } else if (score >= 0.7) {
      rating = 'good';
    } else if (score >= 0.5) {
      rating = 'fair';
    } else {
      rating = 'poor';
    }

    const opportunities: string[] = [];

    if (tokenAnalysis.cacheHitRate < cacheHitThreshold) {
      opportunities.push('Improve prompt caching utilization');
    }
    if (patterns.some((p) => p.description.includes('exceeded'))) {
      opportunities.push('Reduce context size in high-token calls');
    }
    if (patterns.some((p) => p.description.includes('verbose'))) {
      opportunities.push('Control response verbosity');
    }
    if (patterns.some((p) => p.type === 'redundant_calls')) {
      opportunities.push('Consider batching or caching similar requests');
    }

    const summary =
      `Token efficiency is ${rating} (${(score * 100).toFixed(1)}%). ` +
      `Total: ${tokenAnalysis.totalInputTokens + tokenAnalysis.totalOutputTokens} tokens, ` +
      `Cache hit rate: ${(tokenAnalysis.cacheHitRate * 100).toFixed(1)}%, ` +
      `Est. cost: ${tokenAnalysis.costEstimate?.currency || currency} ${
        tokenAnalysis.costEstimate?.totalCost?.toFixed(4) || '0.0000'
      }.`;

    return { rating, summary, opportunities };
  }

  /**
   * Analyzes token efficiency for a single preprocessed trace.
   */
  function analyzeTrace(trace: PreprocessedTrace): TokenEfficiencyResult {
    const spanData = extractSpanTokenData(trace.spans);
    const tokenAnalysis = analyzeTokenUsage(trace.metrics, spanData);
    const patterns = detectPatterns(tokenAnalysis, spanData, trace.metrics);
    const suggestions = generateSuggestions(trace.traceId, tokenAnalysis, patterns, spanData);
    const assessment = generateAssessment(tokenAnalysis, patterns);

    return {
      traceId: trace.traceId,
      tokenAnalysis,
      patterns,
      suggestions,
      assessment,
    };
  }

  /**
   * Analyzes token efficiency for multiple traces and aggregates results.
   */
  function analyzeTraces(traces: PreprocessedTrace[]): AggregatedTokenEfficiencyResult {
    if (traces.length === 0) {
      return {
        traceCount: 0,
        averageMetrics: {
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          efficiencyScore: 0,
          cacheHitRate: 0,
          tokensPerLlmCall: 0,
        },
        totalMetrics: {
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          estimatedCost: 0,
        },
        commonPatterns: [],
        prioritizedSuggestions: [],
        traceResults: [],
      };
    }

    const traceResults = traces.map((trace) => analyzeTrace(trace));

    // Aggregate totals
    const totalMetrics = traceResults.reduce(
      (acc, result) => ({
        inputTokens: acc.inputTokens + result.tokenAnalysis.totalInputTokens,
        outputTokens: acc.outputTokens + result.tokenAnalysis.totalOutputTokens,
        cachedTokens: acc.cachedTokens + result.tokenAnalysis.totalCachedTokens,
        estimatedCost: acc.estimatedCost + (result.tokenAnalysis.costEstimate?.totalCost || 0),
      }),
      { inputTokens: 0, outputTokens: 0, cachedTokens: 0, estimatedCost: 0 }
    );

    // Calculate averages
    const traceCount = traceResults.length;
    const averageMetrics = {
      inputTokens: Math.round(totalMetrics.inputTokens / traceCount),
      outputTokens: Math.round(totalMetrics.outputTokens / traceCount),
      cachedTokens: Math.round(totalMetrics.cachedTokens / traceCount),
      efficiencyScore:
        traceResults.reduce((sum, r) => sum + r.tokenAnalysis.tokenEfficiencyScore, 0) / traceCount,
      cacheHitRate:
        traceResults.reduce((sum, r) => sum + r.tokenAnalysis.cacheHitRate, 0) / traceCount,
      tokensPerLlmCall:
        traceResults.reduce((sum, r) => sum + r.tokenAnalysis.avgTokensPerCall, 0) / traceCount,
    };

    // Find common patterns
    const patternCounts = new Map<string, { count: number; severities: TraceIssueSeverity[] }>();
    traceResults.forEach((result) => {
      result.patterns.forEach((pattern) => {
        const key = pattern.type;
        const existing = patternCounts.get(key) || { count: 0, severities: [] };
        existing.count++;
        existing.severities.push(pattern.severity);
        patternCounts.set(key, existing);
      });
    });

    const commonPatterns = Array.from(patternCounts.entries())
      .filter(([_, data]) => data.count >= Math.max(1, traceCount * 0.3))
      .map(([type, data]) => ({
        type,
        frequency: data.count,
        avgSeverity: getMostCommonSeverity(data.severities),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    // Aggregate and deduplicate suggestions
    const suggestionMap = new Map<string, ImprovementSuggestion>();
    traceResults.forEach((result) => {
      result.suggestions.forEach((suggestion) => {
        const key = suggestion.title.toLowerCase();
        const existing = suggestionMap.get(key);
        if (existing) {
          // Merge evidence and boost priority
          existing.evidence = [...existing.evidence, ...suggestion.evidence];
          existing.priorityScore = Math.min(1, (existing.priorityScore || 0) + 0.05);
        } else {
          suggestionMap.set(key, { ...suggestion });
        }
      });
    });

    const prioritizedSuggestions = Array.from(suggestionMap.values())
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 10);

    return {
      traceCount,
      averageMetrics,
      totalMetrics: {
        ...totalMetrics,
        estimatedCost: Math.round(totalMetrics.estimatedCost * 10000) / 10000,
      },
      commonPatterns,
      prioritizedSuggestions,
      traceResults,
    };
  }

  /**
   * Gets the most common severity from an array of severities.
   */
  function getMostCommonSeverity(severities: TraceIssueSeverity[]): TraceIssueSeverity {
    const counts = { critical: 0, warning: 0, info: 0 };
    severities.forEach((s) => counts[s]++);

    if (counts.critical > 0) return 'critical';
    if (counts.warning >= severities.length * 0.3) return 'warning';
    return 'info';
  }

  /**
   * Analyzes raw token metrics without requiring full trace preprocessing.
   * Useful for quick efficiency checks.
   */
  function analyzeMetrics(metrics: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    llmCallCount: number;
  }): {
    efficiencyScore: number;
    cacheHitRate: number;
    avgTokensPerCall: number;
    costEstimate: { inputCost: number; outputCost: number; totalCost: number; currency: string };
    isEfficient: boolean;
  } {
    const { inputTokens, outputTokens, cachedTokens, llmCallCount } = metrics;

    const efficiencyScore = calculateEfficiencyScore(
      inputTokens,
      outputTokens,
      cachedTokens,
      llmCallCount
    );
    const cacheHitRate = inputTokens > 0 ? cachedTokens / inputTokens : 0;
    const avgTokensPerCall = llmCallCount > 0 ? (inputTokens + outputTokens) / llmCallCount : 0;
    const costEstimate = estimateCost(inputTokens, outputTokens);

    return {
      efficiencyScore: Math.round(efficiencyScore * 1000) / 1000,
      cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
      avgTokensPerCall: Math.round(avgTokensPerCall),
      costEstimate,
      isEfficient: efficiencyScore >= efficiencyThreshold,
    };
  }

  return {
    analyzeTrace,
    analyzeTraces,
    analyzeMetrics,
    extractSpanTokenData,
    calculateEfficiencyScore,
    estimateCost,
  };
}

/**
 * Type for the token efficiency analyzer instance.
 */
export type TokenEfficiencyAnalyzer = ReturnType<typeof createTokenEfficiencyAnalyzer>;
