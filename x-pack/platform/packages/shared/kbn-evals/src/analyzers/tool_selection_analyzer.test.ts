/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToolSelectionAnalyzer } from './tool_selection_analyzer';
import type { RanExperiment } from '../types';

describe('createToolSelectionAnalyzer', () => {
  const createMockExperiment = (overrides: Partial<RanExperiment> = {}): RanExperiment => ({
    id: 'exp-123',
    datasetId: 'dataset-1',
    datasetName: 'Test Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test query 1' },
        expected: { tools: ['search', 'analyze'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }, { name: 'analyze' }] },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test query 2' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }] },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test query 3' },
        expected: { tools: ['analyze', 'summarize'] },
        metadata: null,
        output: { toolCalls: [{ name: 'analyze' }, { name: 'summarize' }] },
      },
    },
    evaluationRuns: [
      {
        name: 'Tool Selection',
        exampleIndex: 0,
        result: {
          score: 1.0,
          label: 'pass',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: true,
            exactMatch: true,
            missingTools: [],
            extraTools: [],
            actualTools: ['search', 'analyze'],
            expectedTools: ['search', 'analyze'],
          },
        },
      },
      {
        name: 'Tool Selection',
        exampleIndex: 1,
        result: {
          score: 1.0,
          label: 'pass',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: true,
            exactMatch: true,
            missingTools: [],
            extraTools: [],
            actualTools: ['search'],
            expectedTools: ['search'],
          },
        },
      },
      {
        name: 'Tool Selection',
        exampleIndex: 2,
        result: {
          score: 1.0,
          label: 'pass',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: true,
            exactMatch: true,
            missingTools: [],
            extraTools: [],
            actualTools: ['analyze', 'summarize'],
            expectedTools: ['analyze', 'summarize'],
          },
        },
      },
    ],
    ...overrides,
  });

  const createLowRecallExperiment = (): RanExperiment => ({
    id: 'exp-low-recall',
    datasetId: 'dataset-low-recall',
    datasetName: 'Low Recall Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { tools: ['search', 'analyze', 'summarize'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }] },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { tools: ['search', 'analyze'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }] },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { tools: ['analyze', 'summarize', 'export'] },
        metadata: null,
        output: { toolCalls: [{ name: 'analyze' }] },
      },
    },
    evaluationRuns: [
      {
        name: 'Tool Selection Recall',
        exampleIndex: 0,
        result: {
          score: 0.33,
          label: 'partial',
          metadata: {
            recall: 0.33,
            precision: 1.0,
            f1: 0.5,
            missingTools: ['analyze', 'summarize'],
            extraTools: [],
            actualTools: ['search'],
            expectedTools: ['search', 'analyze', 'summarize'],
          },
        },
      },
      {
        name: 'Tool Selection Recall',
        exampleIndex: 1,
        result: {
          score: 0.5,
          label: 'partial',
          metadata: {
            recall: 0.5,
            precision: 1.0,
            f1: 0.67,
            missingTools: ['analyze'],
            extraTools: [],
            actualTools: ['search'],
            expectedTools: ['search', 'analyze'],
          },
        },
      },
      {
        name: 'Tool Selection Recall',
        exampleIndex: 2,
        result: {
          score: 0.33,
          label: 'partial',
          metadata: {
            recall: 0.33,
            precision: 1.0,
            f1: 0.5,
            missingTools: ['summarize', 'export'],
            extraTools: [],
            actualTools: ['analyze'],
            expectedTools: ['analyze', 'summarize', 'export'],
          },
        },
      },
    ],
  });

  const createLowPrecisionExperiment = (): RanExperiment => ({
    id: 'exp-low-precision',
    datasetId: 'dataset-low-precision',
    datasetName: 'Low Precision Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }, { name: 'analyze' }, { name: 'export' }] },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { tools: ['analyze'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }, { name: 'analyze' }] },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { tools: ['summarize'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }, { name: 'summarize' }, { name: 'export' }] },
      },
    },
    evaluationRuns: [
      {
        name: 'Tool Selection Precision',
        exampleIndex: 0,
        result: {
          score: 0.33,
          label: 'partial',
          metadata: {
            recall: 1.0,
            precision: 0.33,
            f1: 0.5,
            missingTools: [],
            extraTools: ['analyze', 'export'],
            actualTools: ['search', 'analyze', 'export'],
            expectedTools: ['search'],
          },
        },
      },
      {
        name: 'Tool Selection Precision',
        exampleIndex: 1,
        result: {
          score: 0.5,
          label: 'partial',
          metadata: {
            recall: 1.0,
            precision: 0.5,
            f1: 0.67,
            missingTools: [],
            extraTools: ['search'],
            actualTools: ['search', 'analyze'],
            expectedTools: ['analyze'],
          },
        },
      },
      {
        name: 'Tool Selection Precision',
        exampleIndex: 2,
        result: {
          score: 0.33,
          label: 'partial',
          metadata: {
            recall: 1.0,
            precision: 0.33,
            f1: 0.5,
            missingTools: [],
            extraTools: ['search', 'export'],
            actualTools: ['search', 'summarize', 'export'],
            expectedTools: ['summarize'],
          },
        },
      },
    ],
  });

  const createOrderIncorrectExperiment = (): RanExperiment => ({
    id: 'exp-order-incorrect',
    datasetId: 'dataset-order',
    datasetName: 'Order Incorrect Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { tools: ['search', 'analyze', 'summarize'] },
        metadata: null,
        output: { toolCalls: [{ name: 'summarize' }, { name: 'search' }, { name: 'analyze' }] },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { tools: ['prepare', 'execute', 'cleanup'] },
        metadata: null,
        output: { toolCalls: [{ name: 'execute' }, { name: 'prepare' }, { name: 'cleanup' }] },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { tools: ['init', 'process'] },
        metadata: null,
        output: { toolCalls: [{ name: 'process' }, { name: 'init' }] },
      },
    },
    evaluationRuns: [
      {
        name: 'Tool Selection Order',
        exampleIndex: 0,
        result: {
          score: 0,
          label: 'fail',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: false,
            exactMatch: true,
            actualTools: ['summarize', 'search', 'analyze'],
            expectedTools: ['search', 'analyze', 'summarize'],
          },
        },
      },
      {
        name: 'Tool Selection Order',
        exampleIndex: 1,
        result: {
          score: 0,
          label: 'fail',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: false,
            exactMatch: true,
            actualTools: ['execute', 'prepare', 'cleanup'],
            expectedTools: ['prepare', 'execute', 'cleanup'],
          },
        },
      },
      {
        name: 'Tool Selection Order',
        exampleIndex: 2,
        result: {
          score: 0,
          label: 'fail',
          metadata: {
            recall: 1.0,
            precision: 1.0,
            f1: 1.0,
            orderCorrect: false,
            exactMatch: true,
            actualTools: ['process', 'init'],
            expectedTools: ['init', 'process'],
          },
        },
      },
    ],
  });

  const createHighVarianceExperiment = (): RanExperiment => ({
    id: 'exp-variance',
    datasetId: 'dataset-variance',
    datasetName: 'High Variance Dataset',
    runs: {
      'run-0': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [] },
      },
      'run-1': {
        exampleIndex: 1,
        repetition: 1,
        input: { query: 'test 2' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }] },
      },
      'run-2': {
        exampleIndex: 2,
        repetition: 1,
        input: { query: 'test 3' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [] },
      },
      'run-3': {
        exampleIndex: 3,
        repetition: 1,
        input: { query: 'test 4' },
        expected: { tools: ['search'] },
        metadata: null,
        output: { toolCalls: [{ name: 'search' }] },
      },
    },
    evaluationRuns: [
      { name: 'Tool Selection', exampleIndex: 0, result: { score: 0, label: 'fail' } },
      { name: 'Tool Selection', exampleIndex: 1, result: { score: 1.0, label: 'pass' } },
      { name: 'Tool Selection', exampleIndex: 2, result: { score: 0, label: 'fail' } },
      { name: 'Tool Selection', exampleIndex: 3, result: { score: 1.0, label: 'pass' } },
    ],
  });

  describe('analyzer properties', () => {
    it('should have correct id, name, and description', () => {
      const analyzer = createToolSelectionAnalyzer();

      expect(analyzer.id).toBe('tool-selection-analyzer');
      expect(analyzer.name).toBe('Tool Selection Analyzer');
      expect(analyzer.description).toContain('tool selection patterns');
    });

    it('should have category set to quality', () => {
      const analyzer = createToolSelectionAnalyzer();

      expect(analyzer.category).toBe('quality');
    });

    it('should support heuristic method by default', () => {
      const analyzer = createToolSelectionAnalyzer();

      expect(analyzer.getSupportedMethods()).toContain('heuristic');
      expect(analyzer.isLlmConfigured()).toBe(false);
    });
  });

  describe('canAnalyze', () => {
    it('should return true for experiments with tool selection evaluators', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createMockExperiment();

      expect(analyzer.canAnalyze?.({ experiment })).toBe(true);
    });

    it('should return false for experiments without tool selection evaluators', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createMockExperiment({
        evaluationRuns: [
          { name: 'Correctness', exampleIndex: 0, result: { score: 0.9, label: 'pass' } },
        ],
      });

      expect(analyzer.canAnalyze?.({ experiment })).toBe(false);
    });
  });

  describe('analyzeHeuristic', () => {
    it('should return no findings for well-performing experiments', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createMockExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      expect(result.findings.length).toBe(0);
      expect(result.aggregateMetrics.avgRecall).toBe(1.0);
      expect(result.aggregateMetrics.avgPrecision).toBe(1.0);
    });

    it('should detect low recall issues', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowRecallExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      expect(result.findings.length).toBeGreaterThan(0);

      const recallFinding = result.findings.find((f) => f.issueType === 'low_recall');
      expect(recallFinding).toBeDefined();
      expect(recallFinding?.impact).toBe('high');
      expect(recallFinding?.involvedTools).toContain('analyze');
    });

    it('should detect low precision issues', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowPrecisionExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      const precisionFinding = result.findings.find((f) => f.issueType === 'low_precision');
      expect(precisionFinding).toBeDefined();
      expect(precisionFinding?.involvedTools).toBeDefined();
      expect(precisionFinding?.involvedTools!.length).toBeGreaterThan(0);
    });

    it('should detect tool ordering issues', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createOrderIncorrectExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      const orderFinding = result.findings.find((f) => f.issueType === 'order_incorrect');
      expect(orderFinding).toBeDefined();
      expect(orderFinding?.title).toContain('sequencing');
      expect(orderFinding?.affectedExamples.length).toBe(3);
    });

    it('should detect high variance patterns', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createHighVarianceExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      const varianceFinding = result.findings.find((f) => f.issueType === 'high_variance');
      expect(varianceFinding).toBeDefined();
      expect(varianceFinding?.tags).toContain('variance');
    });

    it('should identify commonly missing tools', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowRecallExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      expect(result.aggregateMetrics.commonMissingTools.length).toBeGreaterThan(0);

      const missingToolFinding = result.findings.find((f) => f.issueType === 'missing_tool');
      expect(missingToolFinding).toBeDefined();
    });

    it('should identify commonly extra tools', () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowPrecisionExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      expect(result.aggregateMetrics.commonExtraTools.length).toBeGreaterThan(0);

      const extraToolFinding = result.findings.find((f) => f.issueType === 'unnecessary_tool');
      expect(extraToolFinding).toBeDefined();
    });

    it('should respect minExamplesForFinding config', () => {
      const analyzer = createToolSelectionAnalyzer({
        minExamplesForFinding: 10, // Set high threshold
      });
      const experiment = createLowRecallExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      // Should not generate findings since we don't have 10 examples
      expect(result.findings.length).toBe(0);
    });

    it('should respect maxFindings config', () => {
      const analyzer = createToolSelectionAnalyzer({
        maxFindings: 2,
      });
      const experiment = createLowRecallExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      expect(result.findings.length).toBeLessThanOrEqual(2);
    });
  });

  describe('analyze', () => {
    it('should use heuristic method by default', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowRecallExperiment();

      const result = await analyzer.analyze({ experiment });

      expect(result.metadata.method).toBe('heuristic');
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should include aggregate metrics', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createLowRecallExperiment();

      const result = await analyzer.analyze({ experiment });

      expect(result.aggregateMetrics).toBeDefined();
      expect(result.aggregateMetrics.avgRecall).toBeLessThan(0.7);
      expect(result.aggregateMetrics.avgPrecision).toBe(1.0);
    });

    it('should include proper metadata', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const experiment = createMockExperiment();

      const result = await analyzer.analyze({ experiment });

      expect(result.metadata.runId).toBe('exp-123');
      expect(result.metadata.datasetName).toBe('Test Dataset');
      expect(result.metadata.analyzedAt).toBeDefined();
    });
  });

  describe('analyzeMultiple', () => {
    it('should analyze multiple experiments', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const results = await analyzer.analyzeMultiple([
        { experiment: createLowRecallExperiment() },
        { experiment: createLowPrecisionExperiment() },
      ]);

      expect(results.length).toBe(2);
      expect(results[0].findings.length).toBeGreaterThan(0);
      expect(results[1].findings.length).toBeGreaterThan(0);
    });
  });

  describe('mergeResults', () => {
    it('should throw on empty results array', () => {
      const analyzer = createToolSelectionAnalyzer();

      expect(() => analyzer.mergeResults([])).toThrow('Cannot merge empty results array');
    });

    it('should return single result unchanged', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      const merged = analyzer.mergeResults([result]);

      expect(merged.findings.length).toBe(result.findings.length);
    });

    it('should merge findings from multiple results', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const result1 = await analyzer.analyze({ experiment: createLowRecallExperiment() });
      const result2 = await analyzer.analyze({ experiment: createLowPrecisionExperiment() });

      const merged = analyzer.mergeResults([result1, result2]);

      // Should have unique findings from both
      expect(merged.findings.length).toBeGreaterThan(0);
      expect(merged.metadata.runId).toContain(',');
    });

    it('should average aggregate metrics', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const result1 = await analyzer.analyze({ experiment: createLowRecallExperiment() });
      const result2 = await analyzer.analyze({ experiment: createLowPrecisionExperiment() });

      const merged = analyzer.mergeResults([result1, result2]);

      // Averaged metrics
      expect(merged.aggregateMetrics.avgRecall).toBeCloseTo(
        (result1.aggregateMetrics.avgRecall + result2.aggregateMetrics.avgRecall) / 2,
        2
      );
    });
  });

  describe('compare', () => {
    it('should identify resolved issues', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const reference = await analyzer.analyze({ experiment: createLowRecallExperiment() });
      const current = await analyzer.analyze({ experiment: createMockExperiment() });

      const comparison = analyzer.compare(current, reference);

      expect(comparison.resolved.length).toBeGreaterThan(0);
      expect(comparison.newIssues.length).toBe(0);
    });

    it('should identify new issues', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const reference = await analyzer.analyze({ experiment: createMockExperiment() });
      const current = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      const comparison = analyzer.compare(current, reference);

      expect(comparison.newIssues.length).toBeGreaterThan(0);
    });

    it('should identify persistent issues', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const result1 = await analyzer.analyze({ experiment: createLowRecallExperiment() });
      const result2 = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      const comparison = analyzer.compare(result1, result2);

      expect(comparison.persistent.length).toBeGreaterThan(0);
    });

    it('should detect metric improvements', async () => {
      const analyzer = createToolSelectionAnalyzer();

      // Create a better-performing experiment
      const referenceExperiment: RanExperiment = {
        ...createLowRecallExperiment(),
        id: 'ref-exp',
      };

      const improvedExperiment: RanExperiment = {
        ...createMockExperiment(),
        id: 'improved-exp',
      };

      const reference = await analyzer.analyze({ experiment: referenceExperiment });
      const current = await analyzer.analyze({ experiment: improvedExperiment });

      const comparison = analyzer.compare(current, reference);

      expect(comparison.improvements.length).toBeGreaterThan(0);
      expect(comparison.improvements.some((i) => i.includes('Recall'))).toBe(true);
    });

    it('should detect metric regressions', async () => {
      const analyzer = createToolSelectionAnalyzer();

      const reference = await analyzer.analyze({ experiment: createMockExperiment() });
      const current = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      const comparison = analyzer.compare(current, reference);

      expect(comparison.regressions.length).toBeGreaterThan(0);
      expect(comparison.regressions.some((r) => r.includes('Recall'))).toBe(true);
    });
  });

  describe('summary generation', () => {
    it('should generate correct impact breakdown', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      expect(result.summary.byImpact).toBeDefined();
      expect(typeof result.summary.byImpact.high).toBe('number');
      expect(typeof result.summary.byImpact.medium).toBe('number');
      expect(typeof result.summary.byImpact.low).toBe('number');
    });

    it('should generate correct category breakdown', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      expect(result.summary.byCategory).toBeDefined();
      // Categories should match issue types
      const totalByCategory = Object.values(result.summary.byCategory).reduce((a, b) => a + b, 0);
      expect(totalByCategory).toBe(result.findings.length);
    });

    it('should include top priority findings', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      expect(result.summary.topPriority.length).toBeLessThanOrEqual(5);
      // Top priority should be sorted by priority score
      for (let i = 1; i < result.summary.topPriority.length; i++) {
        expect(result.summary.topPriority[i - 1].priorityScore).toBeGreaterThanOrEqual(
          result.summary.topPriority[i].priorityScore || 0
        );
      }
    });
  });

  describe('config options', () => {
    it('should respect lowRecallThreshold', () => {
      const analyzer = createToolSelectionAnalyzer({
        lowRecallThreshold: 0.9, // Very high threshold
      });
      const experiment = createMockExperiment({
        evaluationRuns: [
          {
            name: 'Tool Selection',
            exampleIndex: 0,
            result: {
              score: 0.85,
              metadata: { recall: 0.85, precision: 1.0 },
            },
          },
          {
            name: 'Tool Selection',
            exampleIndex: 1,
            result: {
              score: 0.85,
              metadata: { recall: 0.85, precision: 1.0 },
            },
          },
        ],
      });

      const result = analyzer.analyzeHeuristic!({ experiment });

      // Should detect issues because 0.85 < 0.9 threshold
      const recallFinding = result.findings.find((f) => f.issueType === 'low_recall');
      expect(recallFinding).toBeDefined();
    });

    it('should respect lowPrecisionThreshold', () => {
      const analyzer = createToolSelectionAnalyzer({
        lowPrecisionThreshold: 0.9, // Very high threshold
      });
      const experiment = createMockExperiment({
        evaluationRuns: [
          {
            name: 'Tool Selection',
            exampleIndex: 0,
            result: {
              score: 0.85,
              metadata: { recall: 1.0, precision: 0.85 },
            },
          },
          {
            name: 'Tool Selection',
            exampleIndex: 1,
            result: {
              score: 0.85,
              metadata: { recall: 1.0, precision: 0.85 },
            },
          },
        ],
      });

      const result = analyzer.analyzeHeuristic!({ experiment });

      // Should detect issues because 0.85 < 0.9 threshold
      const precisionFinding = result.findings.find((f) => f.issueType === 'low_precision');
      expect(precisionFinding).toBeDefined();
    });

    it('should respect highVarianceThreshold', () => {
      const analyzer = createToolSelectionAnalyzer({
        highVarianceThreshold: 0.1, // Very low threshold
      });
      const experiment = createHighVarianceExperiment();

      const result = analyzer.analyzeHeuristic!({ experiment });

      // Should detect high variance
      const varianceFinding = result.findings.find((f) => f.issueType === 'high_variance');
      expect(varianceFinding).toBeDefined();
    });
  });

  describe('finding quality', () => {
    it('should include actionable action items', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      for (const finding of result.findings) {
        expect(finding.actionItems).toBeDefined();
        expect(finding.actionItems!.length).toBeGreaterThan(0);
        // Action items should be strings, not empty
        for (const item of finding.actionItems!) {
          expect(typeof item).toBe('string');
          expect(item.length).toBeGreaterThan(10);
        }
      }
    });

    it('should include evidence for findings', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      for (const finding of result.findings) {
        expect(finding.evidence).toBeDefined();
        expect(finding.evidence.length).toBeGreaterThan(0);
        // Evidence should have source and type
        for (const evidence of finding.evidence) {
          expect(evidence.source).toBeDefined();
          expect(evidence.type).toBeDefined();
        }
      }
    });

    it('should include affected examples', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      for (const finding of result.findings) {
        expect(finding.affectedExamples).toBeDefined();
        expect(Array.isArray(finding.affectedExamples)).toBe(true);
      }
    });

    it('should include tags for filtering', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      for (const finding of result.findings) {
        expect(finding.tags).toBeDefined();
        expect(finding.tags!.length).toBeGreaterThan(0);
        expect(finding.tags).toContain('heuristic');
      }
    });

    it('should have valid priority scores', async () => {
      const analyzer = createToolSelectionAnalyzer();
      const result = await analyzer.analyze({ experiment: createLowRecallExperiment() });

      for (const finding of result.findings) {
        expect(finding.priorityScore).toBeDefined();
        expect(finding.priorityScore).toBeGreaterThanOrEqual(0);
        expect(finding.priorityScore).toBeLessThanOrEqual(1);
      }
    });
  });
});
