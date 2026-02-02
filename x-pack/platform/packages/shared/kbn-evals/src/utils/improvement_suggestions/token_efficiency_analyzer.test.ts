/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTokenEfficiencyAnalyzer } from './token_efficiency_analyzer';
import type { PreprocessedTrace, NormalizedSpan, TraceMetrics } from './trace_preprocessor';

describe('createTokenEfficiencyAnalyzer', () => {
  const createMockSpan = (overrides: Partial<NormalizedSpan> = {}): NormalizedSpan => ({
    spanId: 'span-1',
    parentSpanId: null,
    name: 'test-span',
    durationMs: 1000,
    timestamp: '2024-01-01T00:00:00Z',
    status: { code: 'OK' },
    kind: 'LLM',
    tokens: {
      input: 1000,
      output: 500,
      cached: 200,
    },
    model: { used: 'gpt-4' },
    isError: false,
    depth: 0,
    rawAttributes: {},
    ...overrides,
  });

  const createMockMetrics = (overrides: Partial<TraceMetrics> = {}): TraceMetrics => ({
    totalDurationMs: 5000,
    spanCount: 5,
    llmCallCount: 2,
    toolCallCount: 2,
    errorCount: 0,
    tokens: {
      input: 2000,
      output: 1000,
      cached: 400,
      total: 2600,
    },
    latencyByKind: { LLM: 3000, TOOL: 1500 },
    modelsUsed: ['gpt-4'],
    toolsCalled: ['search', 'calculate'],
    ...overrides,
  });

  const createMockTrace = (overrides: Partial<PreprocessedTrace> = {}): PreprocessedTrace => ({
    traceId: 'trace-123',
    rootOperation: 'test-operation',
    spans: [
      createMockSpan({ spanId: 'span-1' }),
      createMockSpan({ spanId: 'span-2', tokens: { input: 1000, output: 500, cached: 200 } }),
    ],
    metrics: createMockMetrics(),
    errorSpans: [],
    llmSpans: [createMockSpan({ spanId: 'span-1' }), createMockSpan({ spanId: 'span-2' })],
    toolSpans: [],
    ...overrides,
  });

  describe('analyzeMetrics', () => {
    it('should calculate efficiency metrics correctly', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const result = analyzer.analyzeMetrics({
        inputTokens: 2000,
        outputTokens: 1000,
        cachedTokens: 400,
        llmCallCount: 2,
      });

      expect(result.cacheHitRate).toBe(0.2); // 400/2000
      expect(result.avgTokensPerCall).toBe(1500); // (2000+1000)/2
      expect(result.efficiencyScore).toBeGreaterThan(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(1);
      expect(result.costEstimate).toBeDefined();
      expect(result.costEstimate.currency).toBe('USD');
    });

    it('should handle zero tokens gracefully', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const result = analyzer.analyzeMetrics({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        llmCallCount: 0,
      });

      expect(result.efficiencyScore).toBe(1); // Perfect efficiency when no tokens used
      expect(result.cacheHitRate).toBe(0);
      expect(result.avgTokensPerCall).toBe(0);
      expect(result.isEfficient).toBe(true);
    });

    it('should flag inefficient usage based on threshold', () => {
      const analyzer = createTokenEfficiencyAnalyzer({ efficiencyThreshold: 0.9 });
      const result = analyzer.analyzeMetrics({
        inputTokens: 50000,
        outputTokens: 25000,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      expect(result.isEfficient).toBe(false);
    });
  });

  describe('calculateEfficiencyScore', () => {
    it('should return higher scores for better cache utilization', () => {
      const analyzer = createTokenEfficiencyAnalyzer();

      const noCacheResult = analyzer.analyzeMetrics({
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      const highCacheResult = analyzer.analyzeMetrics({
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 800,
        llmCallCount: 1,
      });

      expect(highCacheResult.efficiencyScore).toBeGreaterThan(noCacheResult.efficiencyScore);
    });

    it('should return higher scores for lower output-to-input ratios', () => {
      const analyzer = createTokenEfficiencyAnalyzer();

      const verboseResult = analyzer.analyzeMetrics({
        inputTokens: 1000,
        outputTokens: 2000,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      const conciseResult = analyzer.analyzeMetrics({
        inputTokens: 1000,
        outputTokens: 200,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      expect(conciseResult.efficiencyScore).toBeGreaterThan(verboseResult.efficiencyScore);
    });
  });

  describe('estimateCost', () => {
    it('should calculate costs based on configuration', () => {
      const analyzer = createTokenEfficiencyAnalyzer({
        inputTokenPricePer1K: 0.01,
        outputTokenPricePer1K: 0.03,
        currency: 'EUR',
      });

      const result = analyzer.analyzeMetrics({
        inputTokens: 10000,
        outputTokens: 5000,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      expect(result.costEstimate.inputCost).toBe(0.1); // 10K * 0.01
      expect(result.costEstimate.outputCost).toBe(0.15); // 5K * 0.03
      expect(result.costEstimate.totalCost).toBe(0.25);
      expect(result.costEstimate.currency).toBe('EUR');
    });
  });

  describe('analyzeTrace', () => {
    it('should analyze a preprocessed trace and return comprehensive results', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const trace = createMockTrace();
      const result = analyzer.analyzeTrace(trace);

      expect(result.traceId).toBe('trace-123');
      expect(result.tokenAnalysis).toBeDefined();
      expect(result.tokenAnalysis.totalInputTokens).toBe(2000);
      expect(result.tokenAnalysis.totalOutputTokens).toBe(1000);
      expect(result.tokenAnalysis.totalCachedTokens).toBe(400);
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.assessment).toBeDefined();
      expect(result.assessment.rating).toBeDefined();
      expect(result.assessment.summary).toContain('Token efficiency');
    });

    it('should detect low cache utilization pattern', () => {
      const analyzer = createTokenEfficiencyAnalyzer({ cacheHitThreshold: 0.5 });
      const trace = createMockTrace({
        metrics: createMockMetrics({
          tokens: { input: 5000, output: 2000, cached: 100, total: 6900 },
        }),
      });

      const result = analyzer.analyzeTrace(trace);
      const cachePattern = result.patterns.find(
        (p) => p.type === 'token_inefficiency' && p.description.includes('cache')
      );

      expect(cachePattern).toBeDefined();
      expect(cachePattern?.recommendation).toContain('cache');
    });

    it('should detect excessive tokens per call', () => {
      const analyzer = createTokenEfficiencyAnalyzer({ maxTokensPerCall: 5000 });
      const trace = createMockTrace({
        spans: [
          createMockSpan({
            spanId: 'span-1',
            tokens: { input: 8000, output: 4000, cached: 0 },
          }),
        ],
        metrics: createMockMetrics({
          tokens: { input: 8000, output: 4000, cached: 0, total: 12000 },
        }),
      });

      const result = analyzer.analyzeTrace(trace);
      const excessivePattern = result.patterns.find(
        (p) => p.type === 'token_inefficiency' && p.description.includes('exceeded')
      );

      expect(excessivePattern).toBeDefined();
    });

    it('should generate improvement suggestions for inefficient traces', () => {
      const analyzer = createTokenEfficiencyAnalyzer({
        cacheHitThreshold: 0.5,
        efficiencyThreshold: 0.8,
      });
      const trace = createMockTrace({
        metrics: createMockMetrics({
          tokens: { input: 10000, output: 8000, cached: 100, total: 17900 },
        }),
      });

      const result = analyzer.analyzeTrace(trace);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].category).toBe('efficiency');
      expect(result.suggestions[0].actionItems).toBeDefined();
      expect(result.suggestions[0].actionItems!.length).toBeGreaterThan(0);
    });

    it('should rate trace efficiency correctly', () => {
      const analyzer = createTokenEfficiencyAnalyzer();

      // Excellent efficiency trace
      const excellentTrace = createMockTrace({
        metrics: createMockMetrics({
          tokens: { input: 1000, output: 200, cached: 800, total: 400 },
        }),
      });
      const excellentResult = analyzer.analyzeTrace(excellentTrace);

      // Poor efficiency trace
      const poorTrace = createMockTrace({
        metrics: createMockMetrics({
          tokens: { input: 50000, output: 40000, cached: 0, total: 90000 },
        }),
      });
      const poorResult = analyzer.analyzeTrace(poorTrace);

      expect(['excellent', 'good']).toContain(excellentResult.assessment.rating);
      expect(['fair', 'poor']).toContain(poorResult.assessment.rating);
    });
  });

  describe('analyzeTraces', () => {
    it('should aggregate results from multiple traces', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const traces = [
        createMockTrace({ traceId: 'trace-1' }),
        createMockTrace({ traceId: 'trace-2' }),
        createMockTrace({ traceId: 'trace-3' }),
      ];

      const result = analyzer.analyzeTraces(traces);

      expect(result.traceCount).toBe(3);
      expect(result.traceResults.length).toBe(3);
      expect(result.averageMetrics).toBeDefined();
      expect(result.totalMetrics).toBeDefined();
      expect(result.totalMetrics.inputTokens).toBe(6000); // 2000 * 3
      expect(result.totalMetrics.outputTokens).toBe(3000); // 1000 * 3
    });

    it('should handle empty traces array', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const result = analyzer.analyzeTraces([]);

      expect(result.traceCount).toBe(0);
      expect(result.traceResults).toEqual([]);
      expect(result.averageMetrics.efficiencyScore).toBe(0);
      expect(result.totalMetrics.estimatedCost).toBe(0);
    });

    it('should identify common patterns across traces', () => {
      const analyzer = createTokenEfficiencyAnalyzer({ cacheHitThreshold: 0.5 });
      const lowCacheTraces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `trace-${i}`,
          metrics: createMockMetrics({
            tokens: { input: 5000, output: 2000, cached: 100, total: 6900 },
          }),
        })
      );

      const result = analyzer.analyzeTraces(lowCacheTraces);

      expect(result.commonPatterns.length).toBeGreaterThan(0);
      expect(result.commonPatterns[0].frequency).toBeGreaterThanOrEqual(3);
    });

    it('should deduplicate and prioritize suggestions', () => {
      const analyzer = createTokenEfficiencyAnalyzer({ cacheHitThreshold: 0.5 });
      const traces = Array.from({ length: 3 }, (_, i) =>
        createMockTrace({
          traceId: `trace-${i}`,
          metrics: createMockMetrics({
            tokens: { input: 5000, output: 2000, cached: 100, total: 6900 },
          }),
        })
      );

      const result = analyzer.analyzeTraces(traces);

      // Should not have duplicate suggestions
      const titles = result.prioritizedSuggestions.map((s) => s.title.toLowerCase());
      const uniqueTitles = [...new Set(titles)];
      expect(titles.length).toBe(uniqueTitles.length);

      // Should be sorted by priority
      for (let i = 1; i < result.prioritizedSuggestions.length; i++) {
        expect(result.prioritizedSuggestions[i - 1].priorityScore).toBeGreaterThanOrEqual(
          result.prioritizedSuggestions[i].priorityScore || 0
        );
      }
    });

    it('should calculate correct aggregate cost', () => {
      const analyzer = createTokenEfficiencyAnalyzer({
        inputTokenPricePer1K: 0.01,
        outputTokenPricePer1K: 0.03,
      });

      const traces = [
        createMockTrace({
          traceId: 'trace-1',
          metrics: createMockMetrics({
            tokens: { input: 1000, output: 500, cached: 0, total: 1500 },
          }),
        }),
        createMockTrace({
          traceId: 'trace-2',
          metrics: createMockMetrics({
            tokens: { input: 2000, output: 1000, cached: 0, total: 3000 },
          }),
        }),
      ];

      const result = analyzer.analyzeTraces(traces);

      // Total: 3000 input tokens, 1500 output tokens
      // Cost: 3K * 0.01 + 1.5K * 0.03 = 0.03 + 0.045 = 0.075
      expect(result.totalMetrics.estimatedCost).toBeCloseTo(0.075, 3);
    });
  });

  describe('extractSpanTokenData', () => {
    it('should extract token data from LLM spans only', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const spans: NormalizedSpan[] = [
        createMockSpan({ spanId: 'llm-1', kind: 'LLM' }),
        createMockSpan({ spanId: 'tool-1', kind: 'TOOL' }),
        createMockSpan({ spanId: 'inference-1', kind: 'INFERENCE' }),
        createMockSpan({ spanId: 'agent-1', kind: 'AGENT' }),
      ];

      const spanData = analyzer.extractSpanTokenData(spans);

      expect(spanData.length).toBe(2); // Only LLM and INFERENCE spans
      expect(spanData.map((s) => s.spanId)).toContain('llm-1');
      expect(spanData.map((s) => s.spanId)).toContain('inference-1');
      expect(spanData.map((s) => s.spanId)).not.toContain('tool-1');
    });

    it('should skip spans without token data', () => {
      const analyzer = createTokenEfficiencyAnalyzer();
      const spans: NormalizedSpan[] = [
        createMockSpan({ spanId: 'llm-1', kind: 'LLM', tokens: { input: 100, output: 50 } }),
        createMockSpan({ spanId: 'llm-2', kind: 'LLM', tokens: undefined }),
        createMockSpan({ spanId: 'llm-3', kind: 'LLM', tokens: { input: 0, output: 0 } }),
      ];

      const spanData = analyzer.extractSpanTokenData(spans);

      expect(spanData.length).toBe(1);
      expect(spanData[0].spanId).toBe('llm-1');
    });
  });

  describe('configuration options', () => {
    it('should respect custom thresholds', () => {
      const strictAnalyzer = createTokenEfficiencyAnalyzer({
        efficiencyThreshold: 0.95,
        cacheHitThreshold: 0.8,
        maxTokensPerCall: 2000,
      });

      const result = strictAnalyzer.analyzeMetrics({
        inputTokens: 3000,
        outputTokens: 1000,
        cachedTokens: 1000,
        llmCallCount: 1,
      });

      // With strict thresholds, this should be flagged as inefficient
      expect(result.isEfficient).toBe(false);
    });

    it('should use custom pricing', () => {
      const analyzer = createTokenEfficiencyAnalyzer({
        inputTokenPricePer1K: 0.001,
        outputTokenPricePer1K: 0.002,
        currency: 'GBP',
      });

      const result = analyzer.analyzeMetrics({
        inputTokens: 1000,
        outputTokens: 1000,
        cachedTokens: 0,
        llmCallCount: 1,
      });

      expect(result.costEstimate.currency).toBe('GBP');
      expect(result.costEstimate.inputCost).toBe(0.001);
      expect(result.costEstimate.outputCost).toBe(0.002);
    });
  });
});
