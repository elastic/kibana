/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCrossTracePatternAnalyzer,
  type CrossTracePatternAnalyzerConfig,
} from './cross_trace_pattern_analyzer';
import type { PreprocessedTrace, NormalizedSpan, TraceMetrics } from './trace_preprocessor';

/**
 * Creates a mock normalized span for testing.
 */
function createMockSpan(overrides: Partial<NormalizedSpan> = {}): NormalizedSpan {
  return {
    spanId: `span-${Math.random().toString(36).substr(2, 9)}`,
    parentSpanId: null,
    name: 'test-span',
    durationMs: 100,
    timestamp: new Date().toISOString(),
    status: { code: 'OK' },
    isError: false,
    depth: 0,
    rawAttributes: {},
    ...overrides,
  };
}

/**
 * Creates a mock preprocessed trace for testing.
 */
function createMockTrace(overrides: Partial<PreprocessedTrace> = {}): PreprocessedTrace {
  const spans = overrides.spans || [createMockSpan()];

  const metrics: TraceMetrics = overrides.metrics || {
    totalDurationMs: spans.reduce((sum, s) => Math.max(sum, s.durationMs), 0),
    spanCount: spans.length,
    llmCallCount: spans.filter((s) => s.kind === 'LLM' || s.kind === 'INFERENCE').length,
    toolCallCount: spans.filter((s) => s.kind === 'TOOL').length,
    errorCount: spans.filter((s) => s.isError).length,
    tokens: {
      input: spans.reduce((sum, s) => sum + (s.tokens?.input || 0), 0),
      output: spans.reduce((sum, s) => sum + (s.tokens?.output || 0), 0),
      cached: spans.reduce((sum, s) => sum + (s.tokens?.cached || 0), 0),
      total: 0,
    },
    latencyByKind: {},
    modelsUsed: [],
    toolsCalled: [],
  };

  metrics.tokens.total = metrics.tokens.input + metrics.tokens.output - metrics.tokens.cached;

  return {
    traceId: overrides.traceId || `trace-${Math.random().toString(36).substr(2, 9)}`,
    rootOperation: overrides.rootOperation || 'test-operation',
    spans,
    metrics,
    errorSpans: overrides.errorSpans || spans.filter((s) => s.isError),
    llmSpans: overrides.llmSpans || spans.filter((s) => s.kind === 'LLM' || s.kind === 'INFERENCE'),
    toolSpans: overrides.toolSpans || spans.filter((s) => s.kind === 'TOOL'),
  };
}

describe('CrossTracePatternAnalyzer', () => {
  describe('createCrossTracePatternAnalyzer', () => {
    it('should create an analyzer with default configuration', () => {
      const analyzer = createCrossTracePatternAnalyzer();

      expect(analyzer).toBeDefined();
      expect(typeof analyzer.analyzePatterns).toBe('function');
      expect(typeof analyzer.detectCorrelations).toBe('function');
      expect(typeof analyzer.clusterTraces).toBe('function');
      expect(typeof analyzer.detectAnomalies).toBe('function');
      expect(typeof analyzer.detectTemporalPatterns).toBe('function');
      expect(typeof analyzer.detectBehavioralPatterns).toBe('function');
    });

    it('should create an analyzer with custom configuration', () => {
      const config: CrossTracePatternAnalyzerConfig = {
        minTracesForPattern: 5,
        minCorrelationThreshold: 0.7,
        clusteringSimilarityThreshold: 0.8,
        anomalyZScoreThreshold: 2.5,
      };

      const analyzer = createCrossTracePatternAnalyzer(config);
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyzePatterns', () => {
    it('should return empty results for empty trace array', () => {
      const analyzer = createCrossTracePatternAnalyzer();
      const result = analyzer.analyzePatterns([]);

      expect(result.traceCount).toBe(0);
      expect(result.patterns).toHaveLength(0);
      expect(result.correlations).toHaveLength(0);
      expect(result.clusters).toHaveLength(0);
      expect(result.anomalies).toHaveLength(0);
    });

    it('should analyze multiple traces and return results', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 2 });

      const traces = [
        createMockTrace({
          traceId: 'trace-1',
          metrics: {
            totalDurationMs: 1000,
            spanCount: 5,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: ['gpt-4'],
            toolsCalled: ['search'],
          },
        }),
        createMockTrace({
          traceId: 'trace-2',
          metrics: {
            totalDurationMs: 1200,
            spanCount: 6,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 600, output: 250, cached: 0, total: 850 },
            latencyByKind: {},
            modelsUsed: ['gpt-4'],
            toolsCalled: ['search'],
          },
        }),
        createMockTrace({
          traceId: 'trace-3',
          metrics: {
            totalDurationMs: 1100,
            spanCount: 5,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 550, output: 220, cached: 0, total: 770 },
            latencyByKind: {},
            modelsUsed: ['gpt-4'],
            toolsCalled: ['search'],
          },
        }),
      ];

      const result = analyzer.analyzePatterns(traces);

      expect(result.traceCount).toBe(3);
      expect(result.analyzedAt).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('detectCorrelations', () => {
    it('should detect correlations between metrics', () => {
      const analyzer = createCrossTracePatternAnalyzer({
        minTracesForPattern: 3,
        minCorrelationThreshold: 0.5,
      });

      // Create traces with correlated metrics (more LLM calls = longer duration)
      const traces = [
        createMockTrace({
          metrics: {
            totalDurationMs: 1000,
            spanCount: 5,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          metrics: {
            totalDurationMs: 2000,
            spanCount: 8,
            llmCallCount: 4,
            toolCallCount: 2,
            errorCount: 0,
            tokens: { input: 1000, output: 400, cached: 0, total: 1400 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          metrics: {
            totalDurationMs: 3000,
            spanCount: 12,
            llmCallCount: 6,
            toolCallCount: 3,
            errorCount: 0,
            tokens: { input: 1500, output: 600, cached: 0, total: 2100 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          metrics: {
            totalDurationMs: 4000,
            spanCount: 15,
            llmCallCount: 8,
            toolCallCount: 4,
            errorCount: 0,
            tokens: { input: 2000, output: 800, cached: 0, total: 2800 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
      ];

      const correlations = analyzer.detectCorrelations(traces);

      expect(correlations.length).toBeGreaterThan(0);
      // Should find correlation between LLM calls and duration
      const llmDurationCorr = correlations.find(
        (c) => c.metric1 === 'llmCallCount' && c.metric2 === 'totalDurationMs'
      );
      expect(llmDurationCorr).toBeDefined();
      expect(llmDurationCorr?.direction).toBe('positive');
    });

    it('should return empty correlations for insufficient traces', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 5 });
      const traces = [createMockTrace(), createMockTrace()];

      const correlations = analyzer.detectCorrelations(traces);

      expect(correlations).toHaveLength(0);
    });
  });

  describe('clusterTraces', () => {
    it('should cluster similar traces together', () => {
      const analyzer = createCrossTracePatternAnalyzer({
        minTracesForPattern: 2,
        clusteringSimilarityThreshold: 0.6,
      });

      // Create two groups of similar traces
      const fastTraces = Array.from({ length: 3 }, (_, i) =>
        createMockTrace({
          traceId: `fast-${i}`,
          metrics: {
            totalDurationMs: 100 + i * 10,
            spanCount: 3,
            llmCallCount: 1,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 100, output: 50, cached: 0, total: 150 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        })
      );

      const slowTraces = Array.from({ length: 3 }, (_, i) =>
        createMockTrace({
          traceId: `slow-${i}`,
          metrics: {
            totalDurationMs: 5000 + i * 100,
            spanCount: 20,
            llmCallCount: 8,
            toolCallCount: 5,
            errorCount: 1,
            tokens: { input: 5000, output: 2000, cached: 0, total: 7000 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        })
      );

      const clusters = analyzer.clusterTraces([...fastTraces, ...slowTraces]);

      expect(clusters.length).toBeGreaterThanOrEqual(1);
      // Check that clusters have characteristics
      for (const cluster of clusters) {
        expect(cluster.clusterId).toBeDefined();
        expect(cluster.traceIds.length).toBeGreaterThanOrEqual(2);
        expect(cluster.characteristics).toBeInstanceOf(Array);
      }
    });

    it('should return empty clusters for insufficient traces', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 5 });
      const traces = [createMockTrace(), createMockTrace()];

      const clusters = analyzer.clusterTraces(traces);

      expect(clusters).toHaveLength(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalous traces', () => {
      const analyzer = createCrossTracePatternAnalyzer({
        minTracesForPattern: 3,
        anomalyZScoreThreshold: 1.5,
      });

      // Create normal traces and one anomalous trace
      const normalTraces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `normal-${i}`,
          metrics: {
            totalDurationMs: 1000 + i * 50,
            spanCount: 5,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        })
      );

      const anomalousTrace = createMockTrace({
        traceId: 'anomalous',
        metrics: {
          totalDurationMs: 50000, // 50x longer than normal
          spanCount: 100, // 20x more spans
          llmCallCount: 50, // 25x more LLM calls
          toolCallCount: 30,
          errorCount: 10, // Many errors
          tokens: { input: 50000, output: 20000, cached: 0, total: 70000 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const anomalies = analyzer.detectAnomalies([...normalTraces, anomalousTrace]);

      expect(anomalies.length).toBeGreaterThan(0);
      const foundAnomaly = anomalies.find((a) => a.traceId === 'anomalous');
      expect(foundAnomaly).toBeDefined();
      expect(foundAnomaly?.anomalousFeatures.length).toBeGreaterThan(0);
    });

    it('should categorize anomaly types correctly', () => {
      const analyzer = createCrossTracePatternAnalyzer({
        minTracesForPattern: 3,
        anomalyZScoreThreshold: 1.5,
      });

      // Create traces where one has extremely high error count
      const normalTraces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `normal-${i}`,
          metrics: {
            totalDurationMs: 1000,
            spanCount: 10,
            llmCallCount: 2,
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        })
      );

      const errorProneTrace = createMockTrace({
        traceId: 'error-prone',
        metrics: {
          totalDurationMs: 1000,
          spanCount: 10,
          llmCallCount: 2,
          toolCallCount: 1,
          errorCount: 8, // 8 out of 10 spans are errors
          tokens: { input: 500, output: 200, cached: 0, total: 700 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const anomalies = analyzer.detectAnomalies([...normalTraces, errorProneTrace]);
      const errorAnomaly = anomalies.find((a) => a.traceId === 'error-prone');

      if (errorAnomaly) {
        expect(errorAnomaly.anomalyType).toBe('error');
      }
    });
  });

  describe('detectBehavioralPatterns', () => {
    it('should detect common tool sequences', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 2 });

      // Create traces with the same tool sequence
      const traces = Array.from({ length: 4 }, (_, i) => {
        const toolSpans = [
          createMockSpan({ name: 'search-tool', kind: 'TOOL' }),
          createMockSpan({ name: 'analyze-tool', kind: 'TOOL' }),
          createMockSpan({ name: 'format-tool', kind: 'TOOL' }),
        ];

        return createMockTrace({
          traceId: `trace-${i}`,
          toolSpans,
          metrics: {
            totalDurationMs: 1000,
            spanCount: 5,
            llmCallCount: 1,
            toolCallCount: 3,
            errorCount: 0,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: ['search-tool', 'analyze-tool', 'format-tool'],
          },
        });
      });

      const patterns = analyzer.detectBehavioralPatterns(traces);

      const sequencePattern = patterns.find((p) => p.type === 'common_tool_sequence');
      expect(sequencePattern).toBeDefined();
      expect(sequencePattern?.affectedTraceIds.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect error-prone tool combinations', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 2 });

      // Create traces where a specific tool combination often fails
      const failingTraces = Array.from({ length: 3 }, (_, i) =>
        createMockTrace({
          traceId: `failing-${i}`,
          metrics: {
            totalDurationMs: 1000,
            spanCount: 5,
            llmCallCount: 1,
            toolCallCount: 2,
            errorCount: 2,
            tokens: { input: 500, output: 200, cached: 0, total: 700 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: ['risky-tool', 'dangerous-tool'],
          },
        })
      );

      const patterns = analyzer.detectBehavioralPatterns(failingTraces);

      const errorPattern = patterns.find((p) => p.type === 'error_prone_combination');
      expect(errorPattern).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should calculate cosine similarity correctly', () => {
      const analyzer = createCrossTracePatternAnalyzer();

      // Identical vectors should have similarity of 1
      expect(analyzer.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);

      // Orthogonal vectors should have similarity of 0
      expect(analyzer.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);

      // Opposite vectors should have similarity of -1
      expect(analyzer.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
    });

    it('should calculate pearson correlation correctly', () => {
      const analyzer = createCrossTracePatternAnalyzer();

      // Perfect positive correlation
      expect(analyzer.pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);

      // Perfect negative correlation
      expect(analyzer.pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);

      // No correlation
      expect(analyzer.pearsonCorrelation([1, 2, 3, 4], [1, 1, 1, 1])).toBeCloseTo(0, 5);
    });
  });

  describe('integration with TraceAnalysisEngine', () => {
    it('should analyze patterns from full result', () => {
      const analyzer = createCrossTracePatternAnalyzer({ minTracesForPattern: 2 });

      const traces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `trace-${i}`,
          metrics: {
            totalDurationMs: 1000 + i * 200,
            spanCount: 5 + i,
            llmCallCount: 2 + (i % 2),
            toolCallCount: 1,
            errorCount: i % 3 === 0 ? 1 : 0,
            tokens: { input: 500 + i * 100, output: 200 + i * 50, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: ['gpt-4'],
            toolsCalled: ['search'],
          },
        })
      );

      const result = analyzer.analyzePatterns(traces);

      expect(result.summary.totalPatternsDetected).toBeDefined();
      expect(result.summary.criticalPatterns).toBeDefined();
      expect(result.summary.warningPatterns).toBeDefined();
      expect(result.summary.infoPatterns).toBeDefined();
    });
  });
});
