/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatReportData } from './report_model_score';
import type { EvaluationScoreDocument } from './score_repository';

describe('formatReportData', () => {
  const baseModel = {
    id: 'gpt-4',
    family: 'openai',
    provider: 'azure',
  };

  const baseEvaluatorModel = {
    id: 'claude-3',
    family: 'claude',
    provider: 'anthropic',
  };

  const createMockScoreDocument = (
    overrides: Partial<EvaluationScoreDocument> = {}
  ): EvaluationScoreDocument => ({
    '@timestamp': '2025-01-01T00:00:00Z',
    run_id: 'run-123',
    experiment_id: 'exp-1',
    repetitions: 1,
    model: baseModel,
    evaluator_model: baseEvaluatorModel,
    dataset: {
      id: 'dataset-1',
      name: 'Test Dataset',
      examples_count: 10,
    },
    evaluator: {
      name: 'Correctness',
      stats: {
        mean: 0.85,
        median: 0.9,
        std_dev: 0.1,
        min: 0.6,
        max: 1.0,
        count: 10,
        percentage: 0.85,
      },
      scores: [0.8, 0.9, 0.85, 0.75, 0.95, 1.0, 0.6, 0.9, 0.85, 0.9],
    },
    environment: {
      hostname: 'test-machine',
    },
    ...overrides,
  });

  it('should transform a single document into a report with dataset scores', () => {
    const docs = [createMockScoreDocument()];
    const report = formatReportData(docs);

    expect(report.model).toEqual(baseModel);
    expect(report.evaluatorModel).toEqual(baseEvaluatorModel);
    expect(report.repetitions).toBe(1);
    expect(report.runId).toBe('run-123');
    expect(report.datasetScoresWithStats).toHaveLength(1);

    const datasetScore = report.datasetScoresWithStats[0];
    expect(datasetScore.id).toBe('dataset-1');
    expect(datasetScore.name).toBe('Test Dataset');
    expect(datasetScore.numExamples).toBe(10);
    expect(datasetScore.experimentId).toBe('exp-1');
    expect(datasetScore.evaluatorScores.get('Correctness')).toEqual([
      0.8, 0.9, 0.85, 0.75, 0.95, 1.0, 0.6, 0.9, 0.85, 0.9,
    ]);
    expect(datasetScore.evaluatorStats.get('Correctness')).toMatchObject({
      mean: 0.85,
      median: 0.9,
      stdDev: 0.1,
      min: 0.6,
      max: 1.0,
      count: 10,
      percentage: 0.85,
    });
  });

  it('should handle multiple evaluators for a single dataset', () => {
    const docs = [
      createMockScoreDocument({
        evaluator: {
          name: 'Correctness',
          stats: {
            mean: 0.85,
            median: 0.9,
            std_dev: 0.1,
            min: 0.6,
            max: 1.0,
            count: 10,
            percentage: 0.85,
          },
          scores: [0.8, 0.9],
        },
      }),
      createMockScoreDocument({
        evaluator: {
          name: 'Groundedness',
          stats: {
            mean: 0.75,
            median: 0.8,
            std_dev: 0.15,
            min: 0.5,
            max: 0.95,
            count: 10,
            percentage: 0.75,
          },
          scores: [0.7, 0.8],
        },
      }),
    ];

    const report = formatReportData(docs);

    expect(report.datasetScoresWithStats).toHaveLength(1);
    const datasetScore = report.datasetScoresWithStats[0];
    expect(datasetScore.evaluatorScores.size).toBe(2);
    expect(datasetScore.evaluatorScores.has('Correctness')).toBe(true);
    expect(datasetScore.evaluatorScores.has('Groundedness')).toBe(true);
    expect(datasetScore.evaluatorStats.size).toBe(2);
  });

  it('should handle multiple datasets with different evaluators', () => {
    const docs = [
      createMockScoreDocument({
        dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 10 },
        experiment_id: 'exp-1',
        evaluator: {
          name: 'Correctness',
          stats: {
            mean: 0.85,
            median: 0.9,
            std_dev: 0.1,
            min: 0.6,
            max: 1.0,
            count: 10,
            percentage: 0.85,
          },
          scores: [0.8, 0.9],
        },
      }),
      createMockScoreDocument({
        dataset: { id: 'dataset-2', name: 'Dataset 2', examples_count: 5 },
        experiment_id: 'exp-2',
        evaluator: {
          name: 'Groundedness',
          stats: {
            mean: 0.75,
            median: 0.8,
            std_dev: 0.15,
            min: 0.5,
            max: 0.95,
            count: 5,
            percentage: 0.75,
          },
          scores: [0.7, 0.8],
        },
      }),
    ];

    const report = formatReportData(docs);

    expect(report.datasetScoresWithStats).toHaveLength(2);
    expect(report.datasetScoresWithStats[0].id).toBe('dataset-1');
    expect(report.datasetScoresWithStats[0].experimentId).toBe('exp-1');
    expect(report.datasetScoresWithStats[1].id).toBe('dataset-2');
    expect(report.datasetScoresWithStats[1].experimentId).toBe('exp-2');
  });

  it('should handle repetitions correctly', () => {
    const docs = [
      createMockScoreDocument({
        repetitions: 3,
        dataset: { id: 'dataset-1', name: 'Dataset 1', examples_count: 30 },
      }),
    ];

    const report = formatReportData(docs);

    expect(report.repetitions).toBe(3);
  });

  it('should throw an error when no documents are provided', () => {
    expect(() => formatReportData([])).toThrow('No documents to format');
  });

  it('should preserve run ID from documents', () => {
    const docs = [createMockScoreDocument({ run_id: 'custom-run-id' })];
    const report = formatReportData(docs);

    expect(report.runId).toBe('custom-run-id');
  });

  it('should correctly map all evaluator statistics', () => {
    const docs = [
      createMockScoreDocument({
        evaluator: {
          name: 'TestEval',
          stats: {
            mean: 0.42,
            median: 0.45,
            std_dev: 0.12,
            min: 0.2,
            max: 0.8,
            count: 15,
            percentage: 0.42,
          },
          scores: [0.42],
        },
      }),
    ];

    const report = formatReportData(docs);
    const stats = report.datasetScoresWithStats[0].evaluatorStats.get('TestEval');

    expect(stats).toEqual({
      mean: 0.42,
      median: 0.45,
      stdDev: 0.12,
      min: 0.2,
      max: 0.8,
      count: 15,
      percentage: 0.42,
    });
  });
});
