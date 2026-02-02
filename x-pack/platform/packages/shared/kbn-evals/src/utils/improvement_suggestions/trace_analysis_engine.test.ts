/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTraceAnalysisEngine, type TraceAnalysisEngineConfig } from './trace_analysis_engine';
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

describe('TraceAnalysisEngine', () => {
  describe('createTraceAnalysisEngine', () => {
    it('should create an engine with default configuration', () => {
      const engine = createTraceAnalysisEngine();

      expect(engine).toBeDefined();
      expect(typeof engine.analyzeTrace).toBe('function');
      expect(typeof engine.analyzeTraces).toBe('function');
      expect(typeof engine.analyzeLatency).toBe('function');
      expect(typeof engine.analyzeTools).toBe('function');
      expect(typeof engine.analyzeLlmCalls).toBe('function');
      expect(typeof engine.analyzeErrors).toBe('function');
      expect(typeof engine.detectPatterns).toBe('function');
    });

    it('should create an engine with custom configuration', () => {
      const config: TraceAnalysisEngineConfig = {
        latencyThresholds: {
          maxTotalDurationMs: 10000,
          maxLlmCallDurationMs: 5000,
        },
        toolThresholds: {
          maxToolFailureRate: 0.05,
        },
        focusAreas: ['tokens', 'latency'],
      };

      const engine = createTraceAnalysisEngine(config);
      expect(engine).toBeDefined();
    });
  });

  describe('analyzeTrace', () => {
    it('should analyze a simple trace and return comprehensive results', () => {
      const engine = createTraceAnalysisEngine();

      const trace = createMockTrace({
        spans: [
          createMockSpan({
            name: 'root',
            durationMs: 1000,
            depth: 0,
          }),
        ],
      });

      const result = engine.analyzeTrace(trace);

      expect(result.traceId).toBe(trace.traceId);
      expect(result.analyzedAt).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallHealthScore).toBeLessThanOrEqual(1);
      expect(result.summary.totalSpans).toBe(1);
      expect(result.detectedPatterns).toBeInstanceOf(Array);
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should analyze a trace with LLM calls', () => {
      const engine = createTraceAnalysisEngine();

      const trace = createMockTrace({
        spans: [
          createMockSpan({
            name: 'root',
            durationMs: 5000,
            depth: 0,
          }),
          createMockSpan({
            name: 'llm-call-1',
            durationMs: 2000,
            kind: 'LLM',
            depth: 1,
            parentSpanId: 'root',
            tokens: { input: 1000, output: 500 },
            model: { used: 'gpt-4' },
          }),
          createMockSpan({
            name: 'llm-call-2',
            durationMs: 1500,
            kind: 'LLM',
            depth: 1,
            parentSpanId: 'root',
            tokens: { input: 800, output: 400, cached: 200 },
            model: { used: 'gpt-4' },
          }),
        ],
      });

      const result = engine.analyzeTrace(trace);

      expect(result.llmCallAnalysis).toBeDefined();
      expect(result.llmCallAnalysis?.totalLlmCalls).toBe(2);
      expect(result.tokenAnalysis).toBeDefined();
      expect(result.latencyAnalysis).toBeDefined();
    });

    it('should detect high latency patterns', () => {
      const engine = createTraceAnalysisEngine({
        latencyThresholds: {
          maxTotalDurationMs: 1000,
        },
      });

      const trace = createMockTrace({
        metrics: {
          totalDurationMs: 5000,
          spanCount: 1,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeTrace(trace);

      const highLatencyPattern = result.detectedPatterns.find((p) => p.type === 'high_latency');
      expect(highLatencyPattern).toBeDefined();
      expect(highLatencyPattern?.severity).toBe('critical');
    });

    it('should detect excessive LLM calls', () => {
      const engine = createTraceAnalysisEngine({
        llmCallThresholds: {
          maxLlmCallsPerTrace: 3,
        },
      });

      const llmSpans = Array.from({ length: 5 }, (_, i) =>
        createMockSpan({
          name: `llm-call-${i}`,
          kind: 'LLM',
          depth: 1,
          tokens: { input: 100, output: 50 },
        })
      );

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...llmSpans],
        llmSpans,
      });

      const result = engine.analyzeTrace(trace);

      const excessiveLlmPattern = result.detectedPatterns.find(
        (p) => p.type === 'excessive_llm_calls'
      );
      expect(excessiveLlmPattern).toBeDefined();
    });

    it('should detect tool failures', () => {
      const engine = createTraceAnalysisEngine({
        toolThresholds: {
          maxToolFailureRate: 0.1,
        },
      });

      const toolSpans = [
        createMockSpan({ name: 'tool-1', kind: 'TOOL', isError: false }),
        createMockSpan({ name: 'tool-2', kind: 'TOOL', isError: true, status: { code: 'ERROR' } }),
        createMockSpan({ name: 'tool-3', kind: 'TOOL', isError: true, status: { code: 'ERROR' } }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...toolSpans],
        toolSpans,
        errorSpans: toolSpans.filter((s) => s.isError),
      });

      const result = engine.analyzeTrace(trace);

      const toolFailurePattern = result.detectedPatterns.find((p) => p.type === 'tool_failures');
      expect(toolFailurePattern).toBeDefined();
      expect(result.toolAnalysis?.failedToolCalls).toBe(2);
    });

    it('should generate issues from analysis', () => {
      const engine = createTraceAnalysisEngine();

      const errorSpan = createMockSpan({
        name: 'failed-operation',
        isError: true,
        status: { code: 'ERROR', message: 'Connection timeout' },
      });

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), errorSpan],
        errorSpans: [errorSpan],
      });

      const result = engine.analyzeTrace(trace);

      expect(result.issues.length).toBeGreaterThan(0);
      const errorIssue = result.issues.find((i) => i.title === 'Error in Trace');
      expect(errorIssue).toBeDefined();
      expect(errorIssue?.severity).toBe('critical');
    });

    it('should respect focus areas configuration', () => {
      const engine = createTraceAnalysisEngine({
        focusAreas: ['tokens'],
      });

      const trace = createMockTrace({
        spans: [
          createMockSpan({
            name: 'llm-call',
            kind: 'LLM',
            tokens: { input: 1000, output: 500 },
          }),
        ],
      });

      const result = engine.analyzeTrace(trace);

      expect(result.tokenAnalysis).toBeDefined();
      // Other analyses should be undefined when not in focus areas
      expect(result.detectedPatterns).toHaveLength(0);
    });
  });

  describe('analyzeTraces (batch analysis)', () => {
    it('should analyze multiple traces and aggregate results', () => {
      const engine = createTraceAnalysisEngine();

      const traces = [
        createMockTrace({ traceId: 'trace-1' }),
        createMockTrace({ traceId: 'trace-2' }),
        createMockTrace({ traceId: 'trace-3' }),
      ];

      const result = engine.analyzeTraces(traces);

      expect(result.summary.totalTracesAnalyzed).toBe(3);
      expect(result.traceResults).toHaveLength(3);
      expect(result.summary.avgHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.avgHealthScore).toBeLessThanOrEqual(1);
    });

    it('should handle empty trace array', () => {
      const engine = createTraceAnalysisEngine();

      const result = engine.analyzeTraces([]);

      expect(result.summary.totalTracesAnalyzed).toBe(0);
      expect(result.traceResults).toHaveLength(0);
      expect(result.summary.avgHealthScore).toBe(0);
    });

    it('should aggregate common patterns across traces', () => {
      const engine = createTraceAnalysisEngine({
        latencyThresholds: {
          maxTotalDurationMs: 100,
        },
      });

      const traces = [
        createMockTrace({
          traceId: 'trace-1',
          metrics: {
            totalDurationMs: 500,
            spanCount: 1,
            llmCallCount: 0,
            toolCallCount: 0,
            errorCount: 0,
            tokens: { input: 0, output: 0, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          traceId: 'trace-2',
          metrics: {
            totalDurationMs: 600,
            spanCount: 1,
            llmCallCount: 0,
            toolCallCount: 0,
            errorCount: 0,
            tokens: { input: 0, output: 0, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
      ];

      const result = engine.analyzeTraces(traces);

      expect(result.aggregatedPatterns.length).toBeGreaterThan(0);
      const highLatencyPattern = result.aggregatedPatterns.find((p) => p.type === 'high_latency');
      expect(highLatencyPattern).toBeDefined();
      expect(highLatencyPattern?.frequency).toBe(2);
      expect(highLatencyPattern?.traceIds).toContain('trace-1');
      expect(highLatencyPattern?.traceIds).toContain('trace-2');
    });

    it('should generate aggregate metrics', () => {
      const engine = createTraceAnalysisEngine();

      const traces = [
        createMockTrace({
          metrics: {
            totalDurationMs: 1000,
            spanCount: 5,
            llmCallCount: 2,
            toolCallCount: 3,
            errorCount: 0,
            tokens: { input: 1000, output: 500, cached: 100, total: 1400 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          metrics: {
            totalDurationMs: 2000,
            spanCount: 10,
            llmCallCount: 4,
            toolCallCount: 6,
            errorCount: 1,
            tokens: { input: 2000, output: 1000, cached: 200, total: 2800 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
      ];

      const result = engine.analyzeTraces(traces);

      expect(result.summary.aggregateMetrics.avgDurationMs).toBe(1500);
      expect(result.summary.aggregateMetrics.avgLlmCallsPerTrace).toBe(3);
      expect(result.summary.aggregateMetrics.avgToolCallsPerTrace).toBe(4.5);
    });

    it('should aggregate recommendations', () => {
      const engine = createTraceAnalysisEngine({
        latencyThresholds: {
          maxTotalDurationMs: 100,
        },
      });

      const traces = [
        createMockTrace({
          metrics: {
            totalDurationMs: 500,
            spanCount: 1,
            llmCallCount: 0,
            toolCallCount: 0,
            errorCount: 0,
            tokens: { input: 0, output: 0, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
        createMockTrace({
          metrics: {
            totalDurationMs: 600,
            spanCount: 1,
            llmCallCount: 0,
            toolCallCount: 0,
            errorCount: 0,
            tokens: { input: 0, output: 0, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        }),
      ];

      const result = engine.analyzeTraces(traces);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.summary.topRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeLatency', () => {
    it('should calculate latency breakdown correctly', () => {
      const engine = createTraceAnalysisEngine();

      const llmSpan = createMockSpan({
        name: 'llm-call',
        kind: 'LLM',
        durationMs: 2000,
        depth: 1,
      });
      const toolSpan = createMockSpan({
        name: 'tool-call',
        kind: 'TOOL',
        durationMs: 1000,
        depth: 1,
      });

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', durationMs: 5000, depth: 0 }), llmSpan, toolSpan],
        metrics: {
          totalDurationMs: 5000,
          spanCount: 3,
          llmCallCount: 1,
          toolCallCount: 1,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
        llmSpans: [llmSpan],
        toolSpans: [toolSpan],
      });

      const result = engine.analyzeLatency(trace);

      expect(result.totalDurationMs).toBe(5000);
      expect(result.llmLatencyMs).toBe(2000);
      expect(result.toolLatencyMs).toBe(1000);
      expect(result.overheadLatencyMs).toBe(2000);
      expect(result.llmLatencyPercentage).toBe(40);
    });

    it('should identify bottlenecks', () => {
      const engine = createTraceAnalysisEngine({
        latencyThresholds: {
          maxLlmCallDurationMs: 1000,
        },
      });

      const slowLlmSpan = createMockSpan({
        name: 'slow-llm-call',
        kind: 'LLM',
        durationMs: 5000,
        depth: 1,
      });

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', durationMs: 6000, depth: 0 }), slowLlmSpan],
        metrics: {
          totalDurationMs: 6000,
          spanCount: 2,
          llmCallCount: 1,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
        llmSpans: [slowLlmSpan],
        toolSpans: [],
      });

      const result = engine.analyzeLatency(trace);

      expect(result.bottlenecks.length).toBeGreaterThan(0);
      const slowLlmBottleneck = result.bottlenecks.find((b) => b.spanName === 'slow-llm-call');
      expect(slowLlmBottleneck).toBeDefined();
      expect(slowLlmBottleneck?.reason).toContain('exceeded');
    });

    it('should find critical path', () => {
      const engine = createTraceAnalysisEngine();

      const spans = [
        createMockSpan({ name: 'root', durationMs: 10000, depth: 0 }),
        createMockSpan({ name: 'fast-span', durationMs: 100, depth: 1 }),
        createMockSpan({ name: 'slow-span', durationMs: 5000, depth: 1 }),
        createMockSpan({ name: 'medium-span', durationMs: 2000, depth: 1 }),
      ];

      const trace = createMockTrace({
        spans,
        metrics: {
          totalDurationMs: 10000,
          spanCount: 4,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeLatency(trace);

      expect(result.criticalPath.length).toBeGreaterThan(0);
      // Should be sorted by duration descending
      expect(result.criticalPath[0].spanName).toBe('root');
      expect(result.criticalPath[1].spanName).toBe('slow-span');
    });
  });

  describe('analyzeTools', () => {
    it('should count tool calls by name', () => {
      const engine = createTraceAnalysisEngine();

      const toolSpans = [
        createMockSpan({ name: 'search-tool', kind: 'TOOL' }),
        createMockSpan({ name: 'search-tool', kind: 'TOOL' }),
        createMockSpan({ name: 'calculator-tool', kind: 'TOOL' }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...toolSpans],
        toolSpans,
      });

      const result = engine.analyzeTools(trace);

      expect(result.totalToolCalls).toBe(3);
      expect(result.toolCallsByName['search-tool']).toBe(2);
      expect(result.toolCallsByName['calculator-tool']).toBe(1);
      expect(result.uniqueToolsUsed).toContain('search-tool');
      expect(result.uniqueToolsUsed).toContain('calculator-tool');
    });

    it('should detect redundant tool calls', () => {
      const engine = createTraceAnalysisEngine({
        toolThresholds: {
          redundantCallThreshold: 3,
        },
      });

      const toolSpans = Array.from({ length: 5 }, () =>
        createMockSpan({ name: 'repeated-tool', kind: 'TOOL' })
      );

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...toolSpans],
        toolSpans,
      });

      const result = engine.analyzeTools(trace);

      expect(result.redundantCalls).toBeDefined();
      expect(result.redundantCalls?.length).toBe(1);
      expect(result.redundantCalls?.[0].toolName).toBe('repeated-tool');
      expect(result.redundantCalls?.[0].count).toBe(5);
    });

    it('should calculate tool failure rate', () => {
      const engine = createTraceAnalysisEngine();

      const toolSpans = [
        createMockSpan({ name: 'tool-1', kind: 'TOOL', isError: false }),
        createMockSpan({ name: 'tool-2', kind: 'TOOL', isError: true, status: { code: 'ERROR' } }),
        createMockSpan({ name: 'tool-3', kind: 'TOOL', isError: false }),
        createMockSpan({ name: 'tool-4', kind: 'TOOL', isError: true, status: { code: 'ERROR' } }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...toolSpans],
        toolSpans,
      });

      const result = engine.analyzeTools(trace);

      expect(result.failedToolCalls).toBe(2);
      expect(result.toolFailureRate).toBe(0.5);
    });
  });

  describe('analyzeLlmCalls', () => {
    it('should count LLM calls by model', () => {
      const engine = createTraceAnalysisEngine();

      const llmSpans = [
        createMockSpan({ name: 'llm-1', kind: 'LLM', model: { used: 'gpt-4' } }),
        createMockSpan({ name: 'llm-2', kind: 'LLM', model: { used: 'gpt-4' } }),
        createMockSpan({ name: 'llm-3', kind: 'INFERENCE', model: { used: 'claude-3' } }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...llmSpans],
        llmSpans,
        metrics: {
          totalDurationMs: 1000,
          spanCount: 4,
          llmCallCount: 3,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: ['gpt-4', 'claude-3'],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeLlmCalls(trace);

      expect(result.totalLlmCalls).toBe(3);
      expect(result.callsByModel['gpt-4']).toBe(2);
      expect(result.callsByModel['claude-3']).toBe(1);
      expect(result.modelsUsed).toContain('gpt-4');
      expect(result.modelsUsed).toContain('claude-3');
    });

    it('should track tokens by model', () => {
      const engine = createTraceAnalysisEngine();

      const llmSpans = [
        createMockSpan({
          name: 'llm-1',
          kind: 'LLM',
          model: { used: 'gpt-4' },
          tokens: { input: 1000, output: 500 },
        }),
        createMockSpan({
          name: 'llm-2',
          kind: 'LLM',
          model: { used: 'gpt-4' },
          tokens: { input: 800, output: 400 },
        }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...llmSpans],
        llmSpans,
        metrics: {
          totalDurationMs: 1000,
          spanCount: 3,
          llmCallCount: 2,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 1800, output: 900, cached: 0, total: 2700 },
          latencyByKind: {},
          modelsUsed: ['gpt-4'],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeLlmCalls(trace);

      expect(result.tokensByModel['gpt-4']).toEqual({
        input: 1800,
        output: 900,
      });
    });

    it('should calculate duration statistics', () => {
      const engine = createTraceAnalysisEngine();

      const llmSpans = [
        createMockSpan({ name: 'llm-1', kind: 'LLM', durationMs: 1000 }),
        createMockSpan({ name: 'llm-2', kind: 'LLM', durationMs: 2000 }),
        createMockSpan({ name: 'llm-3', kind: 'LLM', durationMs: 3000 }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...llmSpans],
        llmSpans,
        metrics: {
          totalDurationMs: 6000,
          spanCount: 4,
          llmCallCount: 3,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeLlmCalls(trace);

      expect(result.avgCallDurationMs).toBe(2000);
      expect(result.maxCallDurationMs).toBe(3000);
    });
  });

  describe('analyzeErrors', () => {
    it('should categorize errors by type', () => {
      const engine = createTraceAnalysisEngine();

      const errorSpans = [
        createMockSpan({
          name: 'error-1',
          isError: true,
          status: { code: 'ERROR', message: 'Timeout' },
        }),
        createMockSpan({
          name: 'error-2',
          isError: true,
          status: { code: 'ERROR', message: 'Timeout' },
        }),
        createMockSpan({
          name: 'error-3',
          isError: true,
          status: { code: 'ERROR', message: 'Connection refused' },
        }),
      ];

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', depth: 0 }), ...errorSpans],
        errorSpans,
        metrics: {
          totalDurationMs: 1000,
          spanCount: 4,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 3,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeErrors(trace);

      expect(result.totalErrors).toBe(3);
      expect(result.errorsByType.Timeout).toBe(2);
      expect(result.errorsByType['Connection refused']).toBe(1);
    });

    it('should calculate error rate', () => {
      const engine = createTraceAnalysisEngine();

      const spans = [
        createMockSpan({ name: 'ok-1' }),
        createMockSpan({ name: 'ok-2' }),
        createMockSpan({ name: 'error-1', isError: true, status: { code: 'ERROR' } }),
      ];

      const trace = createMockTrace({
        spans,
        errorSpans: [spans[2]],
        metrics: {
          totalDurationMs: 1000,
          spanCount: 3,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 1,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeErrors(trace);

      expect(result.errorRate).toBeCloseTo(0.333, 2);
    });

    it('should detect error propagation', () => {
      const engine = createTraceAnalysisEngine({
        errorConfig: {
          trackErrorPropagation: true,
        },
      });

      const rootSpan = createMockSpan({
        spanId: 'root',
        name: 'root',
        depth: 0,
        isError: true,
        status: { code: 'ERROR' },
      });

      const childSpan = createMockSpan({
        spanId: 'child',
        name: 'child',
        parentSpanId: 'root',
        depth: 1,
        isError: true,
        status: { code: 'ERROR' },
      });

      const spans = [rootSpan, childSpan];

      const trace = createMockTrace({
        spans,
        errorSpans: spans,
      });

      const result = engine.analyzeErrors(trace);

      expect(result.errorPropagation).toBeDefined();
      if (result.errorPropagation && result.errorPropagation.length > 0) {
        expect(result.errorPropagation[0].sourceSpanId).toBe('root');
        expect(result.errorPropagation[0].affectedSpanIds).toContain('child');
      }
    });
  });

  describe('health score calculation', () => {
    it('should give high score for healthy trace', () => {
      const engine = createTraceAnalysisEngine();

      const trace = createMockTrace({
        spans: [createMockSpan({ name: 'root', durationMs: 100 })],
        metrics: {
          totalDurationMs: 100,
          spanCount: 1,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 0,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeTrace(trace);

      expect(result.summary.overallHealthScore).toBeGreaterThan(0.8);
    });

    it('should give low score for trace with many errors', () => {
      const engine = createTraceAnalysisEngine();

      const errorSpans = Array.from({ length: 5 }, (_, i) =>
        createMockSpan({
          name: `error-${i}`,
          isError: true,
          status: { code: 'ERROR' },
        })
      );

      const trace = createMockTrace({
        spans: [...errorSpans, createMockSpan({ name: 'ok' })],
        errorSpans,
        metrics: {
          totalDurationMs: 1000,
          spanCount: 6,
          llmCallCount: 0,
          toolCallCount: 0,
          errorCount: 5,
          tokens: { input: 0, output: 0, cached: 0, total: 0 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeTrace(trace);

      expect(result.summary.overallHealthScore).toBeLessThan(0.8);
    });
  });

  describe('cross-trace pattern analysis', () => {
    it('should include cross-trace analysis for multiple traces', () => {
      const engine = createTraceAnalysisEngine();

      const traces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `trace-${i}`,
          metrics: {
            totalDurationMs: 1000 + i * 200,
            spanCount: 5 + i,
            llmCallCount: 2 + (i % 2),
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500 + i * 100, output: 200 + i * 50, cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: ['gpt-4'],
            toolsCalled: ['search'],
          },
        })
      );

      const result = engine.analyzeTraces(traces);

      expect(result.crossTraceAnalysis).toBeDefined();
      expect(result.crossTraceAnalysis?.traceCount).toBe(5);
      expect(result.crossTraceAnalysis?.patterns).toBeInstanceOf(Array);
      expect(result.crossTraceAnalysis?.correlations).toBeInstanceOf(Array);
      expect(result.crossTraceAnalysis?.clusters).toBeInstanceOf(Array);
      expect(result.crossTraceAnalysis?.anomalies).toBeInstanceOf(Array);
    });

    it('should not include cross-trace analysis when disabled', () => {
      const engine = createTraceAnalysisEngine({ enableCrossTraceAnalysis: false });

      const traces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({ traceId: `trace-${i}` })
      );

      const result = engine.analyzeTraces(traces);

      expect(result.crossTraceAnalysis).toBeUndefined();
    });

    it('should not include cross-trace analysis for less than 3 traces', () => {
      const engine = createTraceAnalysisEngine();

      const traces = [createMockTrace({ traceId: 'trace-1' }), createMockTrace({ traceId: 'trace-2' })];

      const result = engine.analyzeTraces(traces);

      expect(result.crossTraceAnalysis).toBeUndefined();
    });

    it('should detect correlations across traces', () => {
      const engine = createTraceAnalysisEngine();

      // Create traces with correlated metrics
      const traces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `trace-${i}`,
          metrics: {
            totalDurationMs: 1000 * (i + 1), // Duration increases linearly
            spanCount: 5,
            llmCallCount: 2 * (i + 1), // LLM calls also increase linearly
            toolCallCount: 1,
            errorCount: 0,
            tokens: { input: 500 * (i + 1), output: 200 * (i + 1), cached: 0, total: 0 },
            latencyByKind: {},
            modelsUsed: [],
            toolsCalled: [],
          },
        })
      );

      const result = engine.analyzeTraces(traces);

      expect(result.crossTraceAnalysis).toBeDefined();
      expect(result.crossTraceAnalysis?.correlations.length).toBeGreaterThan(0);
    });

    it('should detect anomalous traces', () => {
      const engine = createTraceAnalysisEngine({
        crossTracePatternConfig: {
          anomalyZScoreThreshold: 1.5,
        },
      });

      // Create normal traces and one anomalous trace
      const normalTraces = Array.from({ length: 5 }, (_, i) =>
        createMockTrace({
          traceId: `normal-${i}`,
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
        })
      );

      const anomalousTrace = createMockTrace({
        traceId: 'anomalous',
        metrics: {
          totalDurationMs: 50000, // 50x longer
          spanCount: 100,
          llmCallCount: 50,
          toolCallCount: 30,
          errorCount: 10,
          tokens: { input: 50000, output: 20000, cached: 0, total: 70000 },
          latencyByKind: {},
          modelsUsed: [],
          toolsCalled: [],
        },
      });

      const result = engine.analyzeTraces([...normalTraces, anomalousTrace]);

      expect(result.crossTraceAnalysis).toBeDefined();
      expect(result.crossTraceAnalysis?.anomalies.length).toBeGreaterThan(0);
      const foundAnomaly = result.crossTraceAnalysis?.anomalies.find(
        (a) => a.traceId === 'anomalous'
      );
      expect(foundAnomaly).toBeDefined();
    });

    it('should expose cross-trace analysis functions', () => {
      const engine = createTraceAnalysisEngine();

      expect(typeof engine.analyzeCrossTracePatterns).toBe('function');
      expect(typeof engine.detectCorrelations).toBe('function');
      expect(typeof engine.clusterTraces).toBe('function');
      expect(typeof engine.detectAnomalies).toBe('function');
      expect(typeof engine.detectTemporalPatterns).toBe('function');
      expect(typeof engine.detectBehavioralPatterns).toBe('function');
    });
  });
});
