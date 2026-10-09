/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildScoreDocuments, composeScoreName } from './build_score_documents';
import type { EvaluatorResult } from './types';

const baseParams = {
  experimentId: 'exp-1',
  taskModel: { id: 'gpt-4o' },
  evaluatorModel: { id: 'judge-model' },
  metadata: { totalRepetitions: 1, hostname: 'host', executionId: 'exec-1', suiteId: 'suite-1' },
  example: {
    id: 'ex-1',
    index: 0,
    input: { question: 'hi' },
    dataset: { id: 'ds-1', name: 'dataset one' },
  },
  task: { repetitionIndex: 0, traceId: 'trace-1', output: { answer: 'hello' } },
};

describe('composeScoreName', () => {
  it('keeps the bare name for single-score evaluators', () => {
    expect(composeScoreName('groundedness', 'groundedness')).toBe('groundedness');
  });

  it('namespaces multi-score evaluators', () => {
    expect(composeScoreName('correctness', 'factuality')).toBe('correctness.factuality');
  });
});

describe('buildScoreDocuments', () => {
  it('fans a multi-score evaluator into one document per score', () => {
    const evaluatorResults: EvaluatorResult[] = [
      {
        evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
        scores: [
          { name: 'factuality', score: 0.9, explanation: 'ok' },
          { name: 'relevance', score: 0.7 },
          { name: 'sequence_accuracy', score: 1 },
        ],
      },
    ];

    const body = buildScoreDocuments({ ...baseParams, evaluatorResults });

    expect(body.scores).toHaveLength(3);
    expect(body.scores.map((s) => s.evaluator.name)).toEqual([
      'correctness.factuality',
      'correctness.relevance',
      'correctness.sequence_accuracy',
    ]);
    expect(body.experiment_id).toBe('exp-1');
    expect(body.metadata.execution_id).toBe('exec-1');
    expect(body.metadata.suite_id).toBe('suite-1');
    expect(body.task_model.id).toBe('gpt-4o');
  });

  it('propagates example, task and metadata onto every score document', () => {
    const evaluatorResults: EvaluatorResult[] = [
      { evaluator: { name: 'groundedness' }, scores: [{ name: 'groundedness', score: 0.5 }] },
    ];

    const body = buildScoreDocuments({ ...baseParams, evaluatorResults });
    const [score] = body.scores;

    expect(score.example).toEqual({
      id: 'ex-1',
      index: 0,
      input: { question: 'hi' },
      dataset: { id: 'ds-1', name: 'dataset one' },
    });
    expect(score.task.trace_id).toBe('trace-1');
    expect(score.task.repetition_index).toBe(0);
    expect(score.task.output).toEqual({ answer: 'hello' });
    expect(score.evaluator.name).toBe('groundedness');
    expect(score.evaluator.score).toBe(0.5);
  });

  it('omits optional fields that are not provided', () => {
    const evaluatorResults: EvaluatorResult[] = [
      { evaluator: { name: 'latency' }, scores: [{ name: 'latency', score: 12 }] },
    ];

    const body = buildScoreDocuments({
      experimentId: 'exp-2',
      taskModel: { id: 'm' },
      evaluatorModel: { id: 'm' },
      metadata: { totalRepetitions: 1, hostname: 'host' },
      example: { id: 'ex', index: 1, dataset: { id: 'ds', name: 'ds' } },
      task: { repetitionIndex: 0 },
      evaluatorResults,
    });

    const [score] = body.scores;
    expect(score.example.input).toBeUndefined();
    expect(score.task.trace_id).toBeUndefined();
    expect(score.task.output).toBeUndefined();
    expect(body.metadata.execution_id).toBeUndefined();
    expect(body.experiment_name).toBeUndefined();
  });
});
