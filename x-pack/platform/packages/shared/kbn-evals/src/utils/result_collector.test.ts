/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RanExperiment, EvalsExecutorClient } from '../types';
import {
  collectExperimentResults,
  filterResults,
  getResultsByExample,
  getResultsByRepetition,
  getScoresByEvaluator,
  getFailingResults,
  getPassingResults,
  createResultCollector,
} from './result_collector';

describe('result_collector', () => {
  const createMockExperiment = (overrides?: Partial<RanExperiment>): RanExperiment => ({
    id: 'exp-1',
    datasetId: 'dataset-1',
    datasetName: 'Test Dataset',
    datasetDescription: 'A test dataset',
    runs: {
      'run-0-0': {
        exampleIndex: 0,
        repetition: 0,
        input: { query: 'test query 1' },
        expected: 'expected output 1',
        metadata: { source: 'test' },
        output: 'actual output 1',
        evalThreadId: 'thread-1',
      },
      'run-0-1': {
        exampleIndex: 0,
        repetition: 1,
        input: { query: 'test query 1' },
        expected: 'expected output 1',
        metadata: { source: 'test' },
        output: 'actual output 1 rep 2',
        evalThreadId: 'thread-2',
      },
      'run-1-0': {
        exampleIndex: 1,
        repetition: 0,
        input: { query: 'test query 2' },
        expected: 'expected output 2',
        metadata: { source: 'test' },
        output: 'actual output 2',
        evalThreadId: 'thread-3',
      },
    },
    evaluationRuns: [
      {
        name: 'accuracy',
        result: { score: 1.0, label: 'pass', explanation: 'Correct' },
        runKey: 'run-0-0',
        exampleIndex: 0,
        repetition: 0,
      },
      {
        name: 'accuracy',
        result: { score: 0.5, label: 'partial', explanation: 'Partially correct' },
        runKey: 'run-0-1',
        exampleIndex: 0,
        repetition: 1,
      },
      {
        name: 'accuracy',
        result: { score: 0.8, label: 'partial', explanation: 'Mostly correct' },
        runKey: 'run-1-0',
        exampleIndex: 1,
        repetition: 0,
      },
      {
        name: 'relevance',
        result: { score: 1.0, label: 'relevant' },
        runKey: 'run-0-0',
        exampleIndex: 0,
        repetition: 0,
      },
      {
        name: 'relevance',
        result: { score: 0.0, label: 'irrelevant' },
        runKey: 'run-1-0',
        exampleIndex: 1,
        repetition: 0,
      },
    ],
    experimentMetadata: { model: 'test-model' },
    ...overrides,
  });

  describe('collectExperimentResults', () => {
    it('should collect results from experiment runs', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      expect(results.experimentId).toBe('exp-1');
      expect(results.datasetId).toBe('dataset-1');
      expect(results.datasetName).toBe('Test Dataset');
      expect(results.results).toHaveLength(3);
      expect(results.totalExamples).toBe(3);
      expect(results.uniqueExamples).toBe(2);
    });

    it('should calculate evaluator summaries correctly', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const accuracySummary = results.evaluatorSummaries.get('accuracy');
      expect(accuracySummary).toBeDefined();
      expect(accuracySummary!.count).toBe(3);
      expect(accuracySummary!.meanScore).toBeCloseTo(0.767, 2);
      expect(accuracySummary!.passingCount).toBe(1);
      expect(accuracySummary!.failingCount).toBe(2);

      const relevanceSummary = results.evaluatorSummaries.get('relevance');
      expect(relevanceSummary).toBeDefined();
      expect(relevanceSummary!.count).toBe(2);
      expect(relevanceSummary!.meanScore).toBe(0.5);
    });

    it('should associate evaluation results with runs', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const run00 = results.results.find((r) => r.runKey === 'run-0-0');
      expect(run00).toBeDefined();
      expect(run00!.evaluationResults.accuracy?.score).toBe(1.0);
      expect(run00!.evaluationResults.relevance?.score).toBe(1.0);
    });

    it('should handle empty experiments', () => {
      const experiment = createMockExperiment({ runs: {}, evaluationRuns: [] });
      const results = collectExperimentResults(experiment);

      expect(results.results).toHaveLength(0);
      expect(results.evaluatorSummaries.size).toBe(0);
      expect(results.totalExamples).toBe(0);
    });
  });

  describe('filterResults', () => {
    it('should filter by example index', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const filtered = filterResults(results.results, { exampleIndex: 0 });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.exampleIndex === 0)).toBe(true);
    });

    it('should filter by repetition', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const filtered = filterResults(results.results, { repetition: 0 });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.repetition === 0)).toBe(true);
    });

    it('should filter by evaluator name and score range', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const filtered = filterResults(results.results, {
        evaluatorName: 'accuracy',
        minScore: 0.8,
      });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by passing status', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const passing = filterResults(results.results, {
        evaluatorName: 'accuracy',
        passing: true,
      });
      expect(passing).toHaveLength(1);

      const failing = filterResults(results.results, {
        evaluatorName: 'accuracy',
        passing: false,
      });
      expect(failing).toHaveLength(2);
    });
  });

  describe('getResultsByExample', () => {
    it('should return all results for a specific example', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const exampleResults = getResultsByExample(results, 0);
      expect(exampleResults).toHaveLength(2);
      expect(exampleResults.every((r) => r.exampleIndex === 0)).toBe(true);
    });
  });

  describe('getResultsByRepetition', () => {
    it('should return all results for a specific repetition', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const repResults = getResultsByRepetition(results, 0);
      expect(repResults).toHaveLength(2);
      expect(repResults.every((r) => r.repetition === 0)).toBe(true);
    });
  });

  describe('getScoresByEvaluator', () => {
    it('should return all scores for a specific evaluator', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const scores = getScoresByEvaluator(results, 'accuracy');
      expect(scores).toHaveLength(3);
      expect(scores).toContain(1.0);
      expect(scores).toContain(0.5);
      expect(scores).toContain(0.8);
    });

    it('should return empty array for non-existent evaluator', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const scores = getScoresByEvaluator(results, 'nonexistent');
      expect(scores).toHaveLength(0);
    });
  });

  describe('getFailingResults', () => {
    it('should return results with scores below 1', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const failing = getFailingResults(results, 'accuracy');
      expect(failing).toHaveLength(2);
      expect(failing.every((f) => f.score < 1)).toBe(true);
    });
  });

  describe('getPassingResults', () => {
    it('should return results with scores >= 1', () => {
      const experiment = createMockExperiment();
      const results = collectExperimentResults(experiment);

      const passing = getPassingResults(results, 'accuracy');
      expect(passing).toHaveLength(1);
      expect(passing.every((p) => p.score >= 1)).toBe(true);
    });
  });

  describe('createResultCollector', () => {
    it('should add and retrieve experiment results', () => {
      const collector = createResultCollector();
      const experiment = createMockExperiment();

      const results = collector.addExperiment(experiment);
      expect(results.experimentId).toBe('exp-1');

      const allResults = collector.getExperimentResults();
      expect(allResults).toHaveLength(1);
    });

    it('should retrieve experiment by ID', () => {
      const collector = createResultCollector();
      const experiment = createMockExperiment();

      collector.addExperiment(experiment);
      const retrieved = collector.getExperimentById('exp-1');

      expect(retrieved).toBeDefined();
      expect(retrieved!.experimentId).toBe('exp-1');
    });

    it('should return undefined for non-existent experiment ID', () => {
      const collector = createResultCollector();
      const retrieved = collector.getExperimentById('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should calculate aggregated summary', () => {
      const collector = createResultCollector();

      // Add first experiment
      collector.addExperiment(createMockExperiment());

      // Add second experiment with different dataset
      collector.addExperiment(
        createMockExperiment({
          id: 'exp-2',
          datasetId: 'dataset-2',
          datasetName: 'Second Dataset',
        })
      );

      const summary = collector.getAggregatedSummary();

      expect(summary.experimentCount).toBe(2);
      expect(summary.totalResults).toBe(6);
      expect(summary.datasetNames).toContain('Test Dataset');
      expect(summary.datasetNames).toContain('Second Dataset');

      const accuracySummary = summary.evaluatorSummaries.get('accuracy');
      expect(accuracySummary).toBeDefined();
      expect(accuracySummary!.count).toBe(6);
    });

    it('should collect results from executor client', async () => {
      const collector = createResultCollector();
      const experiment = createMockExperiment();

      const mockClient: EvalsExecutorClient = {
        runExperiment: jest.fn(),
        getRanExperiments: jest.fn().mockResolvedValue([experiment]),
      };

      const results = await collector.collectFromClient(mockClient);

      expect(results).toHaveLength(1);
      expect(results[0].experimentId).toBe('exp-1');
      expect(mockClient.getRanExperiments).toHaveBeenCalled();
    });

    it('should clear all collected results', () => {
      const collector = createResultCollector();
      collector.addExperiment(createMockExperiment());

      expect(collector.getExperimentResults()).toHaveLength(1);

      collector.clear();

      expect(collector.getExperimentResults()).toHaveLength(0);
      expect(collector.getExperimentById('exp-1')).toBeUndefined();
    });
  });
});
