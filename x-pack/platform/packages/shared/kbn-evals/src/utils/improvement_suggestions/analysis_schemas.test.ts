/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  traceSpanKindSchema,
  traceSpanStatusSchema,
  traceIssueSeveritySchema,
  tracePatternTypeSchema,
  traceAnalysisPatternSchema,
  traceAnalysisIssueSchema,
  traceTokenAnalysisSchema,
  traceLatencyAnalysisSchema,
  traceToolAnalysisSchema,
  traceLlmCallAnalysisSchema,
  traceErrorAnalysisSchema,
  traceAnalysisResultSchema,
  traceAnalysisInputSchema,
  llmTraceAnalysisResponseSchema,
  batchTraceAnalysisInputSchema,
  batchTraceAnalysisSummarySchema,
  crossTracePatternTypeSchema,
  crossTracePatternSchema,
  traceClusterSchema,
  traceAnomalySchema,
  crossTraceCorrelationSchema,
  crossTraceAnalysisResultSchema,
} from './analysis_schemas';

describe('analysis_schemas', () => {
  describe('traceSpanKindSchema', () => {
    it.each([
      'LLM',
      'INFERENCE',
      'TOOL',
      'AGENT',
      'CHAIN',
      'RETRIEVER',
      'EMBEDDING',
      'RERANKER',
      'OTHER',
    ])('should accept valid kind: %s', (kind) => {
      expect(traceSpanKindSchema.safeParse(kind).success).toBe(true);
    });

    it('should reject invalid kinds', () => {
      expect(traceSpanKindSchema.safeParse('INVALID').success).toBe(false);
      expect(traceSpanKindSchema.safeParse('llm').success).toBe(false);
      expect(traceSpanKindSchema.safeParse('').success).toBe(false);
      expect(traceSpanKindSchema.safeParse(123).success).toBe(false);
    });
  });

  describe('traceSpanStatusSchema', () => {
    it.each(['OK', 'ERROR', 'UNSET'])('should accept valid status: %s', (status) => {
      expect(traceSpanStatusSchema.safeParse(status).success).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(traceSpanStatusSchema.safeParse('FAILED').success).toBe(false);
      expect(traceSpanStatusSchema.safeParse('ok').success).toBe(false);
    });
  });

  describe('traceIssueSeveritySchema', () => {
    it.each(['critical', 'warning', 'info'])('should accept valid severity: %s', (severity) => {
      expect(traceIssueSeveritySchema.safeParse(severity).success).toBe(true);
    });

    it('should reject invalid severities', () => {
      expect(traceIssueSeveritySchema.safeParse('error').success).toBe(false);
      expect(traceIssueSeveritySchema.safeParse('HIGH').success).toBe(false);
    });
  });

  describe('tracePatternTypeSchema', () => {
    const validPatterns = [
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
    ];

    it.each(validPatterns)('should accept valid pattern type: %s', (pattern) => {
      expect(tracePatternTypeSchema.safeParse(pattern).success).toBe(true);
    });

    it('should reject invalid pattern types', () => {
      expect(tracePatternTypeSchema.safeParse('invalid_pattern').success).toBe(false);
    });
  });

  describe('traceAnalysisPatternSchema', () => {
    const validPattern = {
      type: 'high_latency',
      description: 'High latency detected in LLM calls',
      severity: 'warning',
      spanIds: ['span-1', 'span-2'],
    };

    it('should accept valid pattern', () => {
      expect(traceAnalysisPatternSchema.safeParse(validPattern).success).toBe(true);
    });

    it('should accept pattern with optional metrics', () => {
      const patternWithMetrics = {
        ...validPattern,
        metrics: {
          count: 5,
          totalDurationMs: 1000,
          avgDurationMs: 200,
          totalTokens: 5000,
          percentage: 50,
        },
      };
      expect(traceAnalysisPatternSchema.safeParse(patternWithMetrics).success).toBe(true);
    });

    it('should accept pattern with optional recommendation', () => {
      const patternWithRecommendation = {
        ...validPattern,
        recommendation: 'Consider batching LLM calls',
      };
      expect(traceAnalysisPatternSchema.safeParse(patternWithRecommendation).success).toBe(true);
    });

    it('should reject pattern without required fields', () => {
      expect(traceAnalysisPatternSchema.safeParse({ type: 'high_latency' }).success).toBe(false);
      expect(
        traceAnalysisPatternSchema.safeParse({ ...validPattern, spanIds: undefined }).success
      ).toBe(false);
    });

    it('should reject pattern with invalid type', () => {
      expect(
        traceAnalysisPatternSchema.safeParse({ ...validPattern, type: 'invalid' }).success
      ).toBe(false);
    });
  });

  describe('traceAnalysisIssueSchema', () => {
    const validIssue = {
      id: 'issue-1',
      title: 'Slow response time',
      description: 'The response time exceeded 5 seconds',
      severity: 'critical',
    };

    it('should accept valid issue', () => {
      expect(traceAnalysisIssueSchema.safeParse(validIssue).success).toBe(true);
    });

    it('should accept issue with all optional fields', () => {
      const fullIssue = {
        ...validIssue,
        spanId: 'span-123',
        spanName: 'llm_call',
        timestamp: '2024-01-01T00:00:00Z',
        context: { key: 'value' },
        suggestedFix: 'Optimize the prompt',
      };
      expect(traceAnalysisIssueSchema.safeParse(fullIssue).success).toBe(true);
    });

    it('should reject issue without required fields', () => {
      expect(traceAnalysisIssueSchema.safeParse({ id: 'issue-1' }).success).toBe(false);
    });
  });

  describe('traceTokenAnalysisSchema', () => {
    const validTokenAnalysis = {
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      totalCachedTokens: 200,
      cacheHitRate: 0.2,
      avgTokensPerCall: 750,
      tokenEfficiencyScore: 0.8,
    };

    it('should accept valid token analysis', () => {
      expect(traceTokenAnalysisSchema.safeParse(validTokenAnalysis).success).toBe(true);
    });

    it('should accept token analysis with cost estimate', () => {
      const withCost = {
        ...validTokenAnalysis,
        costEstimate: {
          inputCost: 0.01,
          outputCost: 0.015,
          totalCost: 0.025,
          currency: 'USD',
        },
      };
      expect(traceTokenAnalysisSchema.safeParse(withCost).success).toBe(true);
    });

    it('should reject cacheHitRate outside 0-1 range', () => {
      expect(
        traceTokenAnalysisSchema.safeParse({ ...validTokenAnalysis, cacheHitRate: 1.5 }).success
      ).toBe(false);
      expect(
        traceTokenAnalysisSchema.safeParse({ ...validTokenAnalysis, cacheHitRate: -0.1 }).success
      ).toBe(false);
    });

    it('should reject tokenEfficiencyScore outside 0-1 range', () => {
      expect(
        traceTokenAnalysisSchema.safeParse({ ...validTokenAnalysis, tokenEfficiencyScore: 2 })
          .success
      ).toBe(false);
    });
  });

  describe('traceLatencyAnalysisSchema', () => {
    const validLatencyAnalysis = {
      totalDurationMs: 5000,
      llmLatencyMs: 3000,
      toolLatencyMs: 1500,
      overheadLatencyMs: 500,
      llmLatencyPercentage: 60,
      criticalPath: [
        {
          spanId: 'span-1',
          spanName: 'llm_call',
          durationMs: 2000,
          percentage: 40,
        },
      ],
      bottlenecks: [
        {
          spanId: 'span-2',
          spanName: 'tool_call',
          durationMs: 1500,
          reason: 'Sequential execution',
        },
      ],
    };

    it('should accept valid latency analysis', () => {
      expect(traceLatencyAnalysisSchema.safeParse(validLatencyAnalysis).success).toBe(true);
    });

    it('should accept empty arrays for critical path and bottlenecks', () => {
      const minimal = {
        ...validLatencyAnalysis,
        criticalPath: [],
        bottlenecks: [],
      };
      expect(traceLatencyAnalysisSchema.safeParse(minimal).success).toBe(true);
    });

    it('should reject missing required fields', () => {
      expect(traceLatencyAnalysisSchema.safeParse({ totalDurationMs: 5000 }).success).toBe(false);
    });
  });

  describe('traceToolAnalysisSchema', () => {
    const validToolAnalysis = {
      totalToolCalls: 10,
      uniqueToolsUsed: ['search', 'calculate', 'fetch'],
      toolCallsByName: { search: 5, calculate: 3, fetch: 2 },
      failedToolCalls: 1,
      toolFailureRate: 0.1,
      avgToolLatencyMs: 200,
      toolLatencyByName: { search: 150, calculate: 250, fetch: 200 },
    };

    it('should accept valid tool analysis', () => {
      expect(traceToolAnalysisSchema.safeParse(validToolAnalysis).success).toBe(true);
    });

    it('should accept tool analysis with redundant calls', () => {
      const withRedundant = {
        ...validToolAnalysis,
        redundantCalls: [
          {
            toolName: 'search',
            count: 2,
            spanIds: ['span-1', 'span-3'],
          },
        ],
      };
      expect(traceToolAnalysisSchema.safeParse(withRedundant).success).toBe(true);
    });

    it('should reject toolFailureRate outside 0-1 range', () => {
      expect(
        traceToolAnalysisSchema.safeParse({ ...validToolAnalysis, toolFailureRate: 2 }).success
      ).toBe(false);
    });
  });

  describe('traceLlmCallAnalysisSchema', () => {
    const validLlmAnalysis = {
      totalLlmCalls: 5,
      modelsUsed: ['gpt-4', 'gpt-3.5-turbo'],
      avgCallDurationMs: 1000,
      maxCallDurationMs: 2500,
      callsByModel: { 'gpt-4': 3, 'gpt-3.5-turbo': 2 },
      tokensByModel: {
        'gpt-4': { input: 3000, output: 1500 },
        'gpt-3.5-turbo': { input: 2000, output: 1000 },
      },
    };

    it('should accept valid LLM call analysis', () => {
      expect(traceLlmCallAnalysisSchema.safeParse(validLlmAnalysis).success).toBe(true);
    });

    it('should accept with optional sequentialCallsCount', () => {
      const withSequential = {
        ...validLlmAnalysis,
        sequentialCallsCount: 3,
      };
      expect(traceLlmCallAnalysisSchema.safeParse(withSequential).success).toBe(true);
    });
  });

  describe('traceErrorAnalysisSchema', () => {
    const validErrorAnalysis = {
      totalErrors: 2,
      errorRate: 0.1,
      errorsByType: { timeout: 1, validation: 1 },
      errorSpans: [
        {
          spanId: 'span-error-1',
          spanName: 'tool_call',
          errorMessage: 'Connection timeout',
          errorType: 'timeout',
          timestamp: '2024-01-01T00:00:00Z',
          isRecovered: true,
        },
      ],
    };

    it('should accept valid error analysis', () => {
      expect(traceErrorAnalysisSchema.safeParse(validErrorAnalysis).success).toBe(true);
    });

    it('should accept error analysis with error propagation', () => {
      const withPropagation = {
        ...validErrorAnalysis,
        errorPropagation: [
          {
            sourceSpanId: 'span-error-1',
            affectedSpanIds: ['span-2', 'span-3'],
            propagationDepth: 2,
          },
        ],
      };
      expect(traceErrorAnalysisSchema.safeParse(withPropagation).success).toBe(true);
    });

    it('should reject errorRate outside 0-1 range', () => {
      expect(
        traceErrorAnalysisSchema.safeParse({ ...validErrorAnalysis, errorRate: 1.5 }).success
      ).toBe(false);
    });
  });

  describe('traceAnalysisResultSchema', () => {
    const validResult = {
      traceId: 'trace-123',
      analyzedAt: '2024-01-01T00:00:00Z',
      summary: {
        overallHealthScore: 0.85,
        totalSpans: 20,
        totalDurationMs: 5000,
        primaryIssues: ['High latency in LLM calls'],
        recommendations: ['Consider parallel tool execution'],
      },
      detectedPatterns: [],
      issues: [],
    };

    it('should accept valid trace analysis result', () => {
      expect(traceAnalysisResultSchema.safeParse(validResult).success).toBe(true);
    });

    it('should accept result with all optional analysis sections', () => {
      const fullResult = {
        ...validResult,
        tokenAnalysis: {
          totalInputTokens: 1000,
          totalOutputTokens: 500,
          totalCachedTokens: 200,
          cacheHitRate: 0.2,
          avgTokensPerCall: 750,
          tokenEfficiencyScore: 0.8,
        },
        latencyAnalysis: {
          totalDurationMs: 5000,
          llmLatencyMs: 3000,
          toolLatencyMs: 1500,
          overheadLatencyMs: 500,
          llmLatencyPercentage: 60,
          criticalPath: [],
          bottlenecks: [],
        },
        toolAnalysis: {
          totalToolCalls: 10,
          uniqueToolsUsed: ['search'],
          toolCallsByName: { search: 10 },
          failedToolCalls: 0,
          toolFailureRate: 0,
          avgToolLatencyMs: 200,
          toolLatencyByName: { search: 200 },
        },
        llmCallAnalysis: {
          totalLlmCalls: 5,
          modelsUsed: ['gpt-4'],
          avgCallDurationMs: 1000,
          maxCallDurationMs: 2000,
          callsByModel: { 'gpt-4': 5 },
          tokensByModel: { 'gpt-4': { input: 1000, output: 500 } },
        },
        errorAnalysis: {
          totalErrors: 0,
          errorRate: 0,
          errorsByType: {},
          errorSpans: [],
        },
      };
      expect(traceAnalysisResultSchema.safeParse(fullResult).success).toBe(true);
    });

    it('should reject overallHealthScore outside 0-1 range', () => {
      const invalidResult = {
        ...validResult,
        summary: { ...validResult.summary, overallHealthScore: 1.5 },
      };
      expect(traceAnalysisResultSchema.safeParse(invalidResult).success).toBe(false);
    });
  });

  describe('traceAnalysisInputSchema', () => {
    const validInput = {
      traceId: 'trace-123',
      spans: '[]',
      spanCount: 10,
      totalDurationMs: 5000,
    };

    it('should accept valid input', () => {
      expect(traceAnalysisInputSchema.safeParse(validInput).success).toBe(true);
    });

    it('should accept input with all optional fields', () => {
      const fullInput = {
        ...validInput,
        rootOperation: 'main_agent',
        focusAreas: ['tokens', 'latency', 'errors'],
        thresholds: {
          maxLatencyMs: 10000,
          maxTokensPerCall: 5000,
          maxToolFailureRate: 0.1,
          maxLlmCalls: 20,
        },
        additionalContext: 'Focus on performance issues',
      };
      expect(traceAnalysisInputSchema.safeParse(fullInput).success).toBe(true);
    });

    it('should reject invalid focusAreas', () => {
      const invalidInput = {
        ...validInput,
        focusAreas: ['invalid_area'],
      };
      expect(traceAnalysisInputSchema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('llmTraceAnalysisResponseSchema', () => {
    const validResponse = {
      overallAssessment: 'The trace shows moderate efficiency',
      healthScore: 0.75,
      patterns: [
        {
          type: 'high_latency',
          description: 'Slow LLM responses',
          severity: 'warning',
        },
      ],
      issues: [
        {
          title: 'Slow response',
          description: 'Response time exceeded threshold',
          severity: 'warning',
        },
      ],
      recommendations: ['Optimize prompts', 'Use caching'],
    };

    it('should accept valid LLM response', () => {
      expect(llmTraceAnalysisResponseSchema.safeParse(validResponse).success).toBe(true);
    });

    it('should accept response with insights', () => {
      const withInsights = {
        ...validResponse,
        tokenInsights: {
          assessment: 'Token usage is moderate',
          inefficiencies: ['Large context windows'],
          suggestions: ['Reduce prompt size'],
        },
        latencyInsights: {
          assessment: 'Latency is acceptable',
          bottlenecks: ['Sequential LLM calls'],
          suggestions: ['Parallelize where possible'],
        },
      };
      expect(llmTraceAnalysisResponseSchema.safeParse(withInsights).success).toBe(true);
    });

    it('should reject healthScore outside 0-1 range', () => {
      expect(
        llmTraceAnalysisResponseSchema.safeParse({ ...validResponse, healthScore: 2 }).success
      ).toBe(false);
    });
  });

  describe('batchTraceAnalysisInputSchema', () => {
    const validInput = {
      traceIds: ['trace-1', 'trace-2', 'trace-3'],
    };

    it('should accept valid batch input', () => {
      expect(batchTraceAnalysisInputSchema.safeParse(validInput).success).toBe(true);
    });

    it('should accept input with all optional fields', () => {
      const fullInput = {
        ...validInput,
        commonContext: 'Batch of agent interactions',
        compareMode: true,
        aggregateResults: true,
      };
      expect(batchTraceAnalysisInputSchema.safeParse(fullInput).success).toBe(true);
    });

    it('should accept empty traceIds array', () => {
      expect(batchTraceAnalysisInputSchema.safeParse({ traceIds: [] }).success).toBe(true);
    });
  });

  describe('batchTraceAnalysisSummarySchema', () => {
    const validSummary = {
      totalTracesAnalyzed: 10,
      avgHealthScore: 0.8,
      commonPatterns: [
        {
          type: 'high_latency',
          frequency: 7,
          avgSeverity: 'warning',
        },
      ],
      commonIssues: [
        {
          title: 'Slow responses',
          frequency: 5,
          severity: 'warning',
        },
      ],
      aggregateMetrics: {
        avgDurationMs: 5000,
        avgTokensPerTrace: 10000,
        avgLlmCallsPerTrace: 5,
        avgToolCallsPerTrace: 8,
        overallErrorRate: 0.05,
      },
      topRecommendations: ['Implement caching', 'Optimize prompts'],
    };

    it('should accept valid batch summary', () => {
      expect(batchTraceAnalysisSummarySchema.safeParse(validSummary).success).toBe(true);
    });

    it('should reject avgHealthScore outside 0-1 range', () => {
      expect(
        batchTraceAnalysisSummarySchema.safeParse({ ...validSummary, avgHealthScore: 1.5 }).success
      ).toBe(false);
    });
  });

  describe('crossTracePatternTypeSchema', () => {
    const validTypes = [
      'metric_correlation',
      'temporal_degradation',
      'temporal_improvement',
      'common_tool_sequence',
      'error_prone_combination',
      'low_health_cluster',
      'performance_outlier',
      'resource_outlier',
    ];

    it.each(validTypes)('should accept valid cross-trace pattern type: %s', (type) => {
      expect(crossTracePatternTypeSchema.safeParse(type).success).toBe(true);
    });

    it('should reject invalid pattern types', () => {
      expect(crossTracePatternTypeSchema.safeParse('invalid_type').success).toBe(false);
    });
  });

  describe('crossTracePatternSchema', () => {
    const validPattern = {
      type: 'metric_correlation',
      description: 'Strong correlation between input tokens and latency',
      severity: 'info',
      affectedTraceIds: ['trace-1', 'trace-2'],
    };

    it('should accept valid cross-trace pattern', () => {
      expect(crossTracePatternSchema.safeParse(validPattern).success).toBe(true);
    });

    it('should accept pattern with custom type string', () => {
      const customType = {
        ...validPattern,
        type: 'custom_pattern_type',
      };
      expect(crossTracePatternSchema.safeParse(customType).success).toBe(true);
    });

    it('should accept pattern with metrics and recommendation', () => {
      const fullPattern = {
        ...validPattern,
        metrics: { correlation: 0.85, pValue: 0.001 },
        recommendation: 'Consider batching requests',
      };
      expect(crossTracePatternSchema.safeParse(fullPattern).success).toBe(true);
    });
  });

  describe('traceClusterSchema', () => {
    const validCluster = {
      clusterId: 'cluster-1',
      traceIds: ['trace-1', 'trace-2', 'trace-3'],
      size: 3,
      centroidFeatures: { avgDuration: 5000, avgTokens: 10000 },
      characteristics: ['High token usage', 'Long duration'],
      avgDurationMs: 5000,
    };

    it('should accept valid trace cluster', () => {
      expect(traceClusterSchema.safeParse(validCluster).success).toBe(true);
    });

    it('should accept cluster with avgHealthScore', () => {
      const withHealth = {
        ...validCluster,
        avgHealthScore: 0.75,
      };
      expect(traceClusterSchema.safeParse(withHealth).success).toBe(true);
    });

    it('should reject cluster without required fields', () => {
      expect(traceClusterSchema.safeParse({ clusterId: 'cluster-1' }).success).toBe(false);
    });
  });

  describe('traceAnomalySchema', () => {
    const validAnomaly = {
      traceId: 'trace-anomaly',
      anomalyType: 'performance',
      severity: 'critical',
      anomalousFeatures: [
        {
          feature: 'duration',
          zScore: 3.5,
          value: 15000,
        },
      ],
      description: 'Trace duration is 3.5 standard deviations above mean',
    };

    it('should accept valid trace anomaly', () => {
      expect(traceAnomalySchema.safeParse(validAnomaly).success).toBe(true);
    });

    it.each(['performance', 'resource', 'error', 'behavioral'])(
      'should accept anomalyType: %s',
      (type) => {
        expect(traceAnomalySchema.safeParse({ ...validAnomaly, anomalyType: type }).success).toBe(
          true
        );
      }
    );

    it('should accept anomaly with recommendation', () => {
      const withRecommendation = {
        ...validAnomaly,
        recommendation: 'Investigate the cause of high latency',
      };
      expect(traceAnomalySchema.safeParse(withRecommendation).success).toBe(true);
    });

    it('should reject invalid anomalyType', () => {
      expect(
        traceAnomalySchema.safeParse({ ...validAnomaly, anomalyType: 'invalid' }).success
      ).toBe(false);
    });
  });

  describe('crossTraceCorrelationSchema', () => {
    const validCorrelation = {
      metric1: 'inputTokens',
      metric2: 'duration',
      correlationCoefficient: 0.85,
      direction: 'positive',
      sampleSize: 100,
      significance: 'high',
    };

    it('should accept valid correlation', () => {
      expect(crossTraceCorrelationSchema.safeParse(validCorrelation).success).toBe(true);
    });

    it('should accept correlation with affected trace IDs', () => {
      const withTraces = {
        ...validCorrelation,
        affectedTraceIds: ['trace-1', 'trace-2'],
      };
      expect(crossTraceCorrelationSchema.safeParse(withTraces).success).toBe(true);
    });

    it('should reject correlationCoefficient outside -1 to 1 range', () => {
      expect(
        crossTraceCorrelationSchema.safeParse({ ...validCorrelation, correlationCoefficient: 1.5 })
          .success
      ).toBe(false);
      expect(
        crossTraceCorrelationSchema.safeParse({ ...validCorrelation, correlationCoefficient: -1.5 })
          .success
      ).toBe(false);
    });

    it.each(['positive', 'negative', 'none'])('should accept direction: %s', (direction) => {
      expect(
        crossTraceCorrelationSchema.safeParse({ ...validCorrelation, direction }).success
      ).toBe(true);
    });

    it.each(['high', 'medium', 'low'])('should accept significance: %s', (significance) => {
      expect(
        crossTraceCorrelationSchema.safeParse({ ...validCorrelation, significance }).success
      ).toBe(true);
    });
  });

  describe('crossTraceAnalysisResultSchema', () => {
    const validResult = {
      analyzedAt: '2024-01-01T00:00:00Z',
      traceCount: 50,
      patterns: [],
      correlations: [],
      clusters: [],
      anomalies: [],
      summary: {
        totalPatternsDetected: 5,
        criticalPatterns: 1,
        warningPatterns: 2,
        infoPatterns: 2,
        topRecommendations: ['Implement caching', 'Optimize tool calls'],
      },
    };

    it('should accept valid cross-trace analysis result', () => {
      expect(crossTraceAnalysisResultSchema.safeParse(validResult).success).toBe(true);
    });

    it('should accept result with populated arrays', () => {
      const fullResult = {
        ...validResult,
        patterns: [
          {
            type: 'metric_correlation',
            description: 'Token-latency correlation',
            severity: 'info',
            affectedTraceIds: ['trace-1'],
          },
        ],
        correlations: [
          {
            metric1: 'tokens',
            metric2: 'duration',
            correlationCoefficient: 0.9,
            direction: 'positive',
            sampleSize: 50,
            significance: 'high',
          },
        ],
        clusters: [
          {
            clusterId: 'c1',
            traceIds: ['t1', 't2'],
            size: 2,
            centroidFeatures: { avg: 1000 },
            characteristics: ['fast'],
            avgDurationMs: 1000,
          },
        ],
        anomalies: [
          {
            traceId: 'outlier-1',
            anomalyType: 'performance',
            severity: 'warning',
            anomalousFeatures: [{ feature: 'duration', zScore: 2.5, value: 8000 }],
            description: 'High duration outlier',
          },
        ],
      };
      expect(crossTraceAnalysisResultSchema.safeParse(fullResult).success).toBe(true);
    });

    it('should reject result without required summary fields', () => {
      const invalidResult = {
        ...validResult,
        summary: { totalPatternsDetected: 5 },
      };
      expect(crossTraceAnalysisResultSchema.safeParse(invalidResult).success).toBe(false);
    });
  });
});
