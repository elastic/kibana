/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreprocessedTrace, NormalizedSpan } from './trace_preprocessor';
import type {
  TraceIssueSeverity,
  CrossTracePattern,
  TraceCluster,
  TraceAnomaly,
  CrossTraceCorrelation,
  CrossTraceAnalysisResult,
} from './analysis_schemas';

/**
 * Configuration for cross-trace pattern analysis.
 */
export interface CrossTracePatternAnalyzerConfig {
  /**
   * Minimum number of traces required to detect a pattern (default: 3).
   */
  minTracesForPattern?: number;

  /**
   * Minimum correlation coefficient to report a correlation (default: 0.5).
   */
  minCorrelationThreshold?: number;

  /**
   * Similarity threshold for clustering traces (default: 0.7).
   */
  clusteringSimilarityThreshold?: number;

  /**
   * Z-score threshold for anomaly detection (default: 2.0).
   */
  anomalyZScoreThreshold?: number;

  /**
   * Maximum number of clusters to generate (default: 10).
   */
  maxClusters?: number;

  /**
   * Whether to detect temporal patterns (default: true).
   */
  detectTemporalPatterns?: boolean;

  /**
   * Time window in milliseconds for temporal pattern detection (default: 3600000 - 1 hour).
   */
  temporalWindowMs?: number;
}

/**
 * Feature vector representing a trace for similarity calculations.
 */
interface TraceFeatureVector {
  traceId: string;
  features: number[];
  timestamp: number;
  healthScore?: number;
  hasErrors: boolean;
}

/**
 * Creates a cross-trace pattern analyzer with the given configuration.
 *
 * This analyzer identifies patterns that emerge across multiple traces,
 * including correlations, temporal trends, anomalies, and trace clusters.
 *
 * @param config - Configuration options for the analyzer
 * @returns Cross-trace pattern analyzer functions
 *
 * @example
 * ```typescript
 * const analyzer = createCrossTracePatternAnalyzer({
 *   minCorrelationThreshold: 0.6,
 *   anomalyZScoreThreshold: 2.5,
 * });
 *
 * const result = analyzer.analyzePatterns(traces);
 * console.log(`Found ${result.patterns.length} cross-trace patterns`);
 * ```
 */
export function createCrossTracePatternAnalyzer(config: CrossTracePatternAnalyzerConfig = {}) {
  const {
    minTracesForPattern = 3,
    minCorrelationThreshold = 0.5,
    clusteringSimilarityThreshold = 0.7,
    anomalyZScoreThreshold = 2.0,
    maxClusters = 10,
    detectTemporalPatterns: enableTemporalPatterns = true,
    temporalWindowMs = 3600000,
  } = config;

  /**
   * Extracts a feature vector from a trace for similarity calculations.
   */
  function extractFeatures(trace: PreprocessedTrace): TraceFeatureVector {
    const { metrics, spans } = trace;

    // Extract numerical features for similarity calculation
    const features = [
      metrics.totalDurationMs,
      metrics.spanCount,
      metrics.llmCallCount,
      metrics.toolCallCount,
      metrics.errorCount,
      metrics.tokens.input,
      metrics.tokens.output,
      metrics.tokens.cached,
      Object.keys(metrics.latencyByKind).length,
      metrics.modelsUsed.length,
      metrics.toolsCalled.length,
      calculateSpanDepthVariance(spans),
      calculateLlmCallDensity(trace),
      calculateToolCallDensity(trace),
      calculateErrorRate(trace),
    ];

    // Get timestamp from first span or use 0
    const timestamp = spans.length > 0 ? new Date(spans[0].timestamp).getTime() : 0;

    return {
      traceId: trace.traceId,
      features,
      timestamp,
      hasErrors: metrics.errorCount > 0,
    };
  }

  /**
   * Calculates the variance of span depths.
   */
  function calculateSpanDepthVariance(spans: NormalizedSpan[]): number {
    if (spans.length === 0) return 0;
    const depths = spans.map((s) => s.depth);
    const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
    const variance = depths.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / depths.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculates LLM call density (calls per 1000ms of duration).
   */
  function calculateLlmCallDensity(trace: PreprocessedTrace): number {
    const { metrics } = trace;
    if (metrics.totalDurationMs === 0) return 0;
    return (metrics.llmCallCount / metrics.totalDurationMs) * 1000;
  }

  /**
   * Calculates tool call density (calls per 1000ms of duration).
   */
  function calculateToolCallDensity(trace: PreprocessedTrace): number {
    const { metrics } = trace;
    if (metrics.totalDurationMs === 0) return 0;
    return (metrics.toolCallCount / metrics.totalDurationMs) * 1000;
  }

  /**
   * Calculates error rate for a trace.
   */
  function calculateErrorRate(trace: PreprocessedTrace): number {
    const { metrics } = trace;
    if (metrics.spanCount === 0) return 0;
    return metrics.errorCount / metrics.spanCount;
  }

  /**
   * Normalizes feature vectors for comparison (z-score normalization).
   */
  function normalizeFeatures(vectors: TraceFeatureVector[]): TraceFeatureVector[] {
    if (vectors.length === 0) return [];

    const featureCount = vectors[0].features.length;
    const means: number[] = new Array(featureCount).fill(0);
    const stdDevs: number[] = new Array(featureCount).fill(0);

    // Calculate means
    for (const vector of vectors) {
      for (let i = 0; i < featureCount; i++) {
        means[i] += vector.features[i];
      }
    }
    for (let i = 0; i < featureCount; i++) {
      means[i] /= vectors.length;
    }

    // Calculate standard deviations
    for (const vector of vectors) {
      for (let i = 0; i < featureCount; i++) {
        stdDevs[i] += Math.pow(vector.features[i] - means[i], 2);
      }
    }
    for (let i = 0; i < featureCount; i++) {
      stdDevs[i] = Math.sqrt(stdDevs[i] / vectors.length);
    }

    // Normalize vectors
    return vectors.map((vector) => ({
      ...vector,
      features: vector.features.map((f, i) => (stdDevs[i] > 0 ? (f - means[i]) / stdDevs[i] : 0)),
    }));
  }

  /**
   * Calculates cosine similarity between two feature vectors.
   */
  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Calculates Pearson correlation coefficient between two arrays.
   */
  function pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Detects correlations between metrics across traces.
   */
  function detectCorrelations(traces: PreprocessedTrace[]): CrossTraceCorrelation[] {
    if (traces.length < minTracesForPattern) return [];

    const correlations: CrossTraceCorrelation[] = [];

    // Extract metric arrays
    const metrics = traces.map((t) => t.metrics);
    const durations = metrics.map((m) => m.totalDurationMs);
    const llmCalls = metrics.map((m) => m.llmCallCount);
    const toolCalls = metrics.map((m) => m.toolCallCount);
    const errorCounts = metrics.map((m) => m.errorCount);
    const inputTokens = metrics.map((m) => m.tokens.input);
    const outputTokens = metrics.map((m) => m.tokens.output);

    // Define metric pairs to check
    const metricPairs: Array<{
      metric1: string;
      metric2: string;
      values1: number[];
      values2: number[];
    }> = [
      {
        metric1: 'llmCallCount',
        metric2: 'totalDurationMs',
        values1: llmCalls,
        values2: durations,
      },
      {
        metric1: 'toolCallCount',
        metric2: 'totalDurationMs',
        values1: toolCalls,
        values2: durations,
      },
      {
        metric1: 'errorCount',
        metric2: 'totalDurationMs',
        values1: errorCounts,
        values2: durations,
      },
      {
        metric1: 'inputTokens',
        metric2: 'totalDurationMs',
        values1: inputTokens,
        values2: durations,
      },
      {
        metric1: 'outputTokens',
        metric2: 'totalDurationMs',
        values1: outputTokens,
        values2: durations,
      },
      { metric1: 'llmCallCount', metric2: 'inputTokens', values1: llmCalls, values2: inputTokens },
      { metric1: 'llmCallCount', metric2: 'errorCount', values1: llmCalls, values2: errorCounts },
      { metric1: 'toolCallCount', metric2: 'errorCount', values1: toolCalls, values2: errorCounts },
    ];

    for (const { metric1, metric2, values1, values2 } of metricPairs) {
      const coefficient = pearsonCorrelation(values1, values2);

      if (Math.abs(coefficient) >= minCorrelationThreshold) {
        const direction: 'positive' | 'negative' | 'none' =
          coefficient > 0 ? 'positive' : coefficient < 0 ? 'negative' : 'none';

        const affectedTraceIds = traces
          .filter((_, i) => {
            // Find traces where both metrics are above average
            const avg1 = values1.reduce((a, b) => a + b, 0) / values1.length;
            const avg2 = values2.reduce((a, b) => a + b, 0) / values2.length;
            return direction === 'positive'
              ? values1[i] > avg1 && values2[i] > avg2
              : values1[i] > avg1 !== values2[i] > avg2;
          })
          .map((t) => t.traceId);

        correlations.push({
          metric1,
          metric2,
          correlationCoefficient: Math.round(coefficient * 1000) / 1000,
          direction,
          sampleSize: traces.length,
          significance: calculateSignificance(coefficient, traces.length),
          affectedTraceIds: affectedTraceIds.slice(0, 10),
        });
      }
    }

    return correlations.sort(
      (a, b) => Math.abs(b.correlationCoefficient) - Math.abs(a.correlationCoefficient)
    );
  }

  /**
   * Calculates statistical significance (p-value approximation) for correlation.
   */
  function calculateSignificance(r: number, n: number): 'high' | 'medium' | 'low' {
    if (n < 5) return 'low';
    // t-statistic approximation
    const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);
    const absT = Math.abs(t);

    if (absT > 3.5) return 'high';
    if (absT > 2.0) return 'medium';
    return 'low';
  }

  /**
   * Clusters traces based on similarity.
   */
  function clusterTraces(traces: PreprocessedTrace[]): TraceCluster[] {
    if (traces.length < minTracesForPattern) return [];

    // Extract and normalize features
    const vectors = traces.map(extractFeatures);
    const normalizedVectors = normalizeFeatures(vectors);

    // Simple hierarchical clustering
    const clusters: TraceCluster[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < normalizedVectors.length && clusters.length < maxClusters; i++) {
      const centerVector = normalizedVectors[i];
      if (assigned.has(centerVector.traceId)) continue;

      const clusterMembers: string[] = [centerVector.traceId];
      assigned.add(centerVector.traceId);

      // Find similar traces
      for (let j = i + 1; j < normalizedVectors.length; j++) {
        const candidate = normalizedVectors[j];
        if (assigned.has(candidate.traceId)) continue;

        const similarity = cosineSimilarity(centerVector.features, candidate.features);
        if (similarity >= clusteringSimilarityThreshold) {
          clusterMembers.push(candidate.traceId);
          assigned.add(candidate.traceId);
        }
      }

      if (clusterMembers.length >= minTracesForPattern) {
        const tracesInCluster = traces.filter((t) => clusterMembers.includes(t.traceId));

        clusters.push({
          clusterId: `cluster-${clusters.length + 1}`,
          traceIds: clusterMembers,
          size: clusterMembers.length,
          centroidFeatures: calculateCentroid(
            normalizedVectors.filter((v) => clusterMembers.includes(v.traceId))
          ),
          characteristics: describeClusterCharacteristics(tracesInCluster),
          avgHealthScore: calculateAvgHealthScore(tracesInCluster),
          avgDurationMs:
            tracesInCluster.reduce((sum, t) => sum + t.metrics.totalDurationMs, 0) /
            tracesInCluster.length,
        });
      }
    }

    return clusters.sort((a, b) => b.size - a.size);
  }

  /**
   * Calculates the centroid of a cluster.
   */
  function calculateCentroid(vectors: TraceFeatureVector[]): Record<string, number> {
    if (vectors.length === 0) return {};

    const featureCount = vectors[0].features.length;
    const centroid: number[] = new Array(featureCount).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < featureCount; i++) {
        centroid[i] += vector.features[i];
      }
    }

    const featureNames = [
      'duration',
      'spanCount',
      'llmCalls',
      'toolCalls',
      'errors',
      'inputTokens',
      'outputTokens',
      'cachedTokens',
      'spanKindVariety',
      'modelVariety',
      'toolVariety',
      'depthVariance',
      'llmCallDensity',
      'toolCallDensity',
      'errorRate',
    ];

    const result: Record<string, number> = {};
    for (let i = 0; i < featureCount; i++) {
      result[featureNames[i] || `feature${i}`] =
        Math.round((centroid[i] / vectors.length) * 100) / 100;
    }

    return result;
  }

  /**
   * Describes the characteristics of a cluster.
   */
  function describeClusterCharacteristics(tracesInCluster: PreprocessedTrace[]): string[] {
    const characteristics: string[] = [];

    const avgLlmCalls =
      tracesInCluster.reduce((sum, t) => sum + t.metrics.llmCallCount, 0) / tracesInCluster.length;
    const avgToolCalls =
      tracesInCluster.reduce((sum, t) => sum + t.metrics.toolCallCount, 0) / tracesInCluster.length;
    const avgErrors =
      tracesInCluster.reduce((sum, t) => sum + t.metrics.errorCount, 0) / tracesInCluster.length;
    const avgDuration =
      tracesInCluster.reduce((sum, t) => sum + t.metrics.totalDurationMs, 0) /
      tracesInCluster.length;
    const avgTokens =
      tracesInCluster.reduce((sum, t) => sum + t.metrics.tokens.total, 0) / tracesInCluster.length;

    if (avgLlmCalls > 5) characteristics.push('High LLM call count');
    if (avgLlmCalls < 2) characteristics.push('Low LLM call count');
    if (avgToolCalls > 5) characteristics.push('Heavy tool usage');
    if (avgToolCalls < 1) characteristics.push('Minimal tool usage');
    if (avgErrors > 0.5) characteristics.push('Error-prone');
    if (avgErrors === 0) characteristics.push('Error-free');
    if (avgDuration > 10000) characteristics.push('Long-running');
    if (avgDuration < 1000) characteristics.push('Fast execution');
    if (avgTokens > 5000) characteristics.push('High token consumption');
    if (avgTokens < 500) characteristics.push('Low token consumption');

    // Check for common models
    const modelCounts = new Map<string, number>();
    for (const trace of tracesInCluster) {
      for (const model of trace.metrics.modelsUsed) {
        modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      }
    }
    const dominantModel = Array.from(modelCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (dominantModel && dominantModel[1] >= tracesInCluster.length * 0.8) {
      characteristics.push(`Primarily uses ${dominantModel[0]}`);
    }

    return characteristics;
  }

  /**
   * Calculates average health score for traces (if available).
   */
  function calculateAvgHealthScore(traces: PreprocessedTrace[]): number | undefined {
    // Health score would need to be passed from trace analysis results
    // For now, calculate a simple proxy based on error rate
    const errorRate =
      traces.reduce((sum, t) => sum + t.metrics.errorCount, 0) /
      Math.max(
        1,
        traces.reduce((sum, t) => sum + t.metrics.spanCount, 0)
      );

    return Math.round((1 - errorRate) * 100) / 100;
  }

  /**
   * Detects anomalous traces using z-score analysis.
   */
  function detectAnomalies(traces: PreprocessedTrace[]): TraceAnomaly[] {
    if (traces.length < minTracesForPattern) return [];

    const anomalies: TraceAnomaly[] = [];
    const vectors = traces.map(extractFeatures);
    const normalizedVectors = normalizeFeatures(vectors);

    const featureNames = [
      'duration',
      'spanCount',
      'llmCalls',
      'toolCalls',
      'errors',
      'inputTokens',
      'outputTokens',
      'cachedTokens',
      'spanKindVariety',
      'modelVariety',
      'toolVariety',
      'depthVariance',
      'llmCallDensity',
      'toolCallDensity',
      'errorRate',
    ];

    for (let i = 0; i < normalizedVectors.length; i++) {
      const vector = normalizedVectors[i];
      const trace = traces[i];
      const anomalousFeatures: Array<{ feature: string; zScore: number; value: number }> = [];

      for (let j = 0; j < vector.features.length; j++) {
        const zScore = vector.features[j];
        if (Math.abs(zScore) >= anomalyZScoreThreshold) {
          anomalousFeatures.push({
            feature: featureNames[j] || `feature${j}`,
            zScore: Math.round(zScore * 100) / 100,
            value: vectors[i].features[j],
          });
        }
      }

      if (anomalousFeatures.length > 0) {
        const severity: TraceIssueSeverity = anomalousFeatures.some((f) => Math.abs(f.zScore) > 3)
          ? 'critical'
          : 'warning';

        anomalies.push({
          traceId: trace.traceId,
          anomalyType: determineAnomalyType(anomalousFeatures),
          severity,
          anomalousFeatures,
          description: generateAnomalyDescription(anomalousFeatures, trace),
          recommendation: generateAnomalyRecommendation(anomalousFeatures),
        });
      }
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Determines the type of anomaly based on features.
   */
  function determineAnomalyType(
    features: Array<{ feature: string; zScore: number }>
  ): 'performance' | 'resource' | 'error' | 'behavioral' {
    const hasPerformance = features.some(
      (f) => f.feature === 'duration' || f.feature.includes('Density')
    );
    const hasResource = features.some(
      (f) => f.feature.includes('Token') || f.feature.includes('Calls')
    );
    const hasError = features.some((f) => f.feature === 'errors' || f.feature === 'errorRate');

    if (hasError) return 'error';
    if (hasPerformance) return 'performance';
    if (hasResource) return 'resource';
    return 'behavioral';
  }

  /**
   * Generates a human-readable description of the anomaly.
   */
  function generateAnomalyDescription(
    features: Array<{ feature: string; zScore: number; value: number }>,
    trace: PreprocessedTrace
  ): string {
    const descriptions: string[] = [];

    for (const f of features.slice(0, 3)) {
      const direction = f.zScore > 0 ? 'unusually high' : 'unusually low';
      descriptions.push(`${f.feature} is ${direction} (z=${f.zScore})`);
    }

    return `Trace ${trace.traceId.slice(0, 8)}... shows anomalous behavior: ${descriptions.join(
      ', '
    )}.`;
  }

  /**
   * Generates recommendations for addressing the anomaly.
   */
  function generateAnomalyRecommendation(
    features: Array<{ feature: string; zScore: number }>
  ): string {
    const highDuration = features.find((f) => f.feature === 'duration' && f.zScore > 0);
    const highErrors = features.find(
      (f) => (f.feature === 'errors' || f.feature === 'errorRate') && f.zScore > 0
    );
    const highTokens = features.find((f) => f.feature.includes('Token') && f.zScore > 0);
    const highLlmCalls = features.find((f) => f.feature === 'llmCalls' && f.zScore > 0);

    if (highErrors) {
      return 'Investigate error patterns and implement appropriate error handling.';
    }
    if (highDuration && highLlmCalls) {
      return 'Consider parallelizing LLM calls or reducing call count to improve latency.';
    }
    if (highTokens) {
      return 'Review prompt design to reduce token consumption.';
    }
    if (highDuration) {
      return 'Analyze the critical path for optimization opportunities.';
    }

    return 'Review trace details to identify the cause of anomalous behavior.';
  }

  /**
   * Detects temporal patterns in traces over time.
   */
  function detectTemporalPatterns(
    traces: PreprocessedTrace[]
  ): Array<CrossTracePattern & { type: 'temporal_degradation' | 'temporal_improvement' }> {
    if (!enableTemporalPatterns || traces.length < minTracesForPattern) return [];

    const patterns: Array<
      CrossTracePattern & { type: 'temporal_degradation' | 'temporal_improvement' }
    > = [];

    // Sort traces by timestamp
    const sortedTraces = [...traces].sort((a, b) => {
      const timeA = a.spans.length > 0 ? new Date(a.spans[0].timestamp).getTime() : 0;
      const timeB = b.spans.length > 0 ? new Date(b.spans[0].timestamp).getTime() : 0;
      return timeA - timeB;
    });

    if (sortedTraces.length < 2) return patterns;

    // Calculate metrics for time windows
    const windows: Array<{ startTime: number; traces: PreprocessedTrace[] }> = [];
    let currentWindow: { startTime: number; traces: PreprocessedTrace[] } | null = null;

    for (const trace of sortedTraces) {
      const timestamp = trace.spans.length > 0 ? new Date(trace.spans[0].timestamp).getTime() : 0;

      if (!currentWindow || timestamp - currentWindow.startTime > temporalWindowMs) {
        currentWindow = { startTime: timestamp, traces: [] };
        windows.push(currentWindow);
      }
      currentWindow.traces.push(trace);
    }

    if (windows.length < 2) return patterns;

    // Compare first and last windows
    const firstWindow = windows[0];
    const lastWindow = windows[windows.length - 1];

    const firstAvgDuration =
      firstWindow.traces.reduce((sum, t) => sum + t.metrics.totalDurationMs, 0) /
      firstWindow.traces.length;
    const lastAvgDuration =
      lastWindow.traces.reduce((sum, t) => sum + t.metrics.totalDurationMs, 0) /
      lastWindow.traces.length;

    const firstErrorRate =
      firstWindow.traces.reduce((sum, t) => sum + t.metrics.errorCount, 0) /
      firstWindow.traces.reduce((sum, t) => sum + t.metrics.spanCount, 0);
    const lastErrorRate =
      lastWindow.traces.reduce((sum, t) => sum + t.metrics.errorCount, 0) /
      lastWindow.traces.reduce((sum, t) => sum + t.metrics.spanCount, 0);

    // Check for performance degradation
    const durationChange = (lastAvgDuration - firstAvgDuration) / firstAvgDuration;
    if (Math.abs(durationChange) > 0.2) {
      const type = durationChange > 0 ? 'temporal_degradation' : 'temporal_improvement';
      const severity: TraceIssueSeverity = Math.abs(durationChange) > 0.5 ? 'warning' : 'info';

      patterns.push({
        type,
        description: `Average duration ${
          type === 'temporal_degradation' ? 'increased' : 'decreased'
        } by ${Math.abs(Math.round(durationChange * 100))}% over the analysis period.`,
        severity,
        affectedTraceIds: lastWindow.traces.map((t) => t.traceId),
        metrics: {
          changePercentage: Math.round(durationChange * 100),
          startValue: Math.round(firstAvgDuration),
          endValue: Math.round(lastAvgDuration),
        },
        recommendation:
          type === 'temporal_degradation'
            ? 'Investigate recent changes that may have impacted performance.'
            : 'Document the improvements for future reference.',
      });
    }

    // Check for error rate changes
    const errorChange = lastErrorRate - firstErrorRate;
    if (Math.abs(errorChange) > 0.05) {
      const type = errorChange > 0 ? 'temporal_degradation' : 'temporal_improvement';
      const severity: TraceIssueSeverity = errorChange > 0.1 ? 'critical' : 'warning';

      patterns.push({
        type,
        description: `Error rate ${errorChange > 0 ? 'increased' : 'decreased'} from ${Math.round(
          firstErrorRate * 100
        )}% to ${Math.round(lastErrorRate * 100)}% over the analysis period.`,
        severity,
        affectedTraceIds: lastWindow.traces
          .filter((t) => t.metrics.errorCount > 0)
          .map((t) => t.traceId),
        metrics: {
          changePercentage: Math.round(errorChange * 100),
          startValue: Math.round(firstErrorRate * 100),
          endValue: Math.round(lastErrorRate * 100),
        },
        recommendation:
          errorChange > 0
            ? 'Investigate the source of increasing errors and implement fixes.'
            : 'Verify that error reduction is consistent and document the fix.',
      });
    }

    return patterns;
  }

  /**
   * Detects common behavioral patterns across traces.
   */
  function detectBehavioralPatterns(traces: PreprocessedTrace[]): CrossTracePattern[] {
    if (traces.length < minTracesForPattern) return [];

    const patterns: CrossTracePattern[] = [];

    // Detect common tool sequences
    const toolSequences = new Map<string, string[]>();
    for (const trace of traces) {
      const toolSeq = trace.toolSpans.map((s) => s.name).join(' -> ');
      if (toolSeq) {
        if (!toolSequences.has(toolSeq)) {
          toolSequences.set(toolSeq, []);
        }
        toolSequences.get(toolSeq)!.push(trace.traceId);
      }
    }

    for (const [sequence, traceIds] of toolSequences) {
      if (traceIds.length >= minTracesForPattern) {
        patterns.push({
          type: 'common_tool_sequence',
          description: `Tool sequence "${sequence}" appears in ${traceIds.length} traces.`,
          severity: 'info',
          affectedTraceIds: traceIds,
          metrics: {
            frequency: traceIds.length,
            percentage: Math.round((traceIds.length / traces.length) * 100),
          },
          recommendation:
            traceIds.length > traces.length * 0.5
              ? 'This is a dominant execution pattern. Consider optimizing this path.'
              : undefined,
        });
      }
    }

    // Detect traces that always fail with certain tool combinations
    const failingToolCombos = new Map<
      string,
      { total: number; failed: number; traceIds: string[] }
    >();
    for (const trace of traces) {
      const toolCombo = trace.metrics.toolsCalled.sort().join('+');
      if (!failingToolCombos.has(toolCombo)) {
        failingToolCombos.set(toolCombo, { total: 0, failed: 0, traceIds: [] });
      }
      const combo = failingToolCombos.get(toolCombo)!;
      combo.total++;
      if (trace.metrics.errorCount > 0) {
        combo.failed++;
        combo.traceIds.push(trace.traceId);
      }
    }

    for (const [combo, data] of failingToolCombos) {
      if (data.total >= minTracesForPattern && data.failed / data.total > 0.5) {
        patterns.push({
          type: 'error_prone_combination',
          description: `Tool combination [${combo}] has a ${Math.round(
            (data.failed / data.total) * 100
          )}% failure rate across ${data.total} traces.`,
          severity: 'warning',
          affectedTraceIds: data.traceIds,
          metrics: {
            totalOccurrences: data.total,
            failureCount: data.failed,
            failureRate: Math.round((data.failed / data.total) * 100),
          },
          recommendation: 'Investigate why this tool combination frequently leads to errors.',
        });
      }
    }

    return patterns;
  }

  /**
   * Performs comprehensive cross-trace pattern analysis.
   */
  function analyzePatterns(
    traces: PreprocessedTrace[],
    healthScores?: Map<string, number>
  ): CrossTraceAnalysisResult {
    if (traces.length === 0) {
      return {
        analyzedAt: new Date().toISOString(),
        traceCount: 0,
        patterns: [],
        correlations: [],
        clusters: [],
        anomalies: [],
        summary: {
          totalPatternsDetected: 0,
          criticalPatterns: 0,
          warningPatterns: 0,
          infoPatterns: 0,
          topRecommendations: [],
        },
      };
    }

    // Detect various pattern types
    const correlations = detectCorrelations(traces);
    const clusters = clusterTraces(traces);
    const anomalies = detectAnomalies(traces);
    const temporalPatterns = detectTemporalPatterns(traces);
    const behavioralPatterns = detectBehavioralPatterns(traces);

    // Combine all patterns
    const allPatterns: CrossTracePattern[] = [...temporalPatterns, ...behavioralPatterns];

    // Add correlation-based patterns
    for (const corr of correlations) {
      if (Math.abs(corr.correlationCoefficient) >= 0.7) {
        allPatterns.push({
          type: 'metric_correlation',
          description: `Strong ${corr.direction} correlation (r=${corr.correlationCoefficient}) between ${corr.metric1} and ${corr.metric2}.`,
          severity: corr.significance === 'high' ? 'warning' : 'info',
          affectedTraceIds: corr.affectedTraceIds,
          metrics: {
            correlationCoefficient: corr.correlationCoefficient,
          },
          recommendation: `Consider this relationship when optimizing ${corr.metric1} or ${corr.metric2}.`,
        });
      }
    }

    // Add cluster-based patterns
    for (const cluster of clusters) {
      if (cluster.avgHealthScore !== undefined && cluster.avgHealthScore < 0.6) {
        allPatterns.push({
          type: 'low_health_cluster',
          description: `Cluster of ${cluster.size} similar traces with low average health score (${cluster.avgHealthScore}).`,
          severity: cluster.avgHealthScore < 0.4 ? 'critical' : 'warning',
          affectedTraceIds: cluster.traceIds,
          metrics: {
            clusterSize: cluster.size,
            avgHealthScore: cluster.avgHealthScore,
          },
          recommendation: `Investigate common issues in this cluster: ${cluster.characteristics.join(
            ', '
          )}.`,
        });
      }
    }

    // Count patterns by severity
    const criticalPatterns =
      allPatterns.filter((p) => p.severity === 'critical').length +
      anomalies.filter((a) => a.severity === 'critical').length;
    const warningPatterns =
      allPatterns.filter((p) => p.severity === 'warning').length +
      anomalies.filter((a) => a.severity === 'warning').length;
    const infoPatterns = allPatterns.filter((p) => p.severity === 'info').length;

    // Generate top recommendations
    const recommendations = new Set<string>();
    for (const pattern of allPatterns) {
      if (pattern.recommendation) {
        recommendations.add(pattern.recommendation);
      }
    }
    for (const anomaly of anomalies) {
      if (anomaly.recommendation) {
        recommendations.add(anomaly.recommendation);
      }
    }

    return {
      analyzedAt: new Date().toISOString(),
      traceCount: traces.length,
      patterns: allPatterns,
      correlations,
      clusters,
      anomalies,
      summary: {
        totalPatternsDetected: allPatterns.length + anomalies.length,
        criticalPatterns,
        warningPatterns,
        infoPatterns,
        topRecommendations: Array.from(recommendations).slice(0, 10),
      },
    };
  }

  return {
    analyzePatterns,
    detectCorrelations,
    clusterTraces,
    detectAnomalies,
    detectTemporalPatterns,
    detectBehavioralPatterns,
    extractFeatures,
    cosineSimilarity,
    pearsonCorrelation,
  };
}

/**
 * Type for the cross-trace pattern analyzer instance.
 */
export type CrossTracePatternAnalyzer = ReturnType<typeof createCrossTracePatternAnalyzer>;
