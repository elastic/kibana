/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapToEvaluationScoreDocuments, buildSingleScoreDocument } from './report_model_score';
import type { RanExperiment, EvaluationCompleteEvent } from '../types';
import { ModelProvider, ModelFamily } from '@kbn/inference-common';

describe('mapToEvaluationScoreDocuments', () => {
  const taskModel = {
    id: 'gpt-4',
    family: ModelFamily.GPT,
    provider: ModelProvider.OpenAI,
  };

  const evaluatorModel = {
    id: 'claude-3',
    family: ModelFamily.Claude,
    provider: ModelProvider.Anthropic,
  };

  it('builds documents with dataset name from runs', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': {
            exampleIndex: 0,
            repetition: 0,
            input: { question: 'one' },
            expected: undefined,
            metadata: undefined,
            output: undefined,
          },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            result: { score: 0.5 },
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await mapToEvaluationScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.dataset.name).toBe('Dataset 1');
    expect(docs[0].example.id).toBe('0');
    expect(docs[0].example.input).toEqual({ question: 'one' });
    expect(docs[0].task.output).toBeNull();
  });

  it('uses experiment run id to resolve example id when available', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': {
            exampleIndex: 0,
            repetition: 0,
            input: { question: 'two' },
            expected: undefined,
            metadata: undefined,
            output: undefined,
            traceId: 'trace-1',
          },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            result: { score: 0.9 },
            exampleId: 'example-2',
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await mapToEvaluationScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.id).toBe('example-2');
    expect(docs[0].task.trace_id).toBe('trace-1');
  });

  it('includes task output when present', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': {
            exampleIndex: 0,
            repetition: 0,
            input: { question: 'three' },
            expected: undefined,
            metadata: undefined,
            output: { answer: 'yes' },
          },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            result: { score: 0.6 },
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await mapToEvaluationScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].task.output).toEqual({ answer: 'yes' });
  });
});

describe('buildSingleScoreDocument', () => {
  const taskModel = {
    id: 'gpt-4',
    family: ModelFamily.GPT,
    provider: ModelProvider.OpenAI,
  };

  const evaluatorModel = {
    id: 'claude-3',
    family: ModelFamily.Claude,
    provider: ModelProvider.Anthropic,
  };

  const baseEvent: EvaluationCompleteEvent = {
    experimentId: 'exp-1',
    datasetId: 'dataset-1',
    datasetName: 'Dataset 1',
    taskRun: {
      exampleIndex: 0,
      repetition: 0,
      input: { question: 'one' },
      expected: undefined,
      metadata: undefined,
      output: { answer: 'yes' },
      traceId: 'trace-task-1',
    },
    evaluationRun: {
      name: 'Correctness',
      experimentRunId: 'run-key-1',
      result: { score: 0.9, label: 'PASS', explanation: 'Correct.' },
      traceId: 'trace-eval-1',
      exampleId: 'example-1',
    },
    exampleId: 'example-1',
  };

  it('builds a well-formed score document from an event', () => {
    const doc = buildSingleScoreDocument({
      event: baseEvent,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 3,
      timestamp: '2025-06-01T00:00:00Z',
      gitMetadata: { branch: 'main', commitSha: 'abc123' },
      hostName: 'test-host',
    });

    expect(doc['@timestamp']).toBe('2025-06-01T00:00:00Z');
    expect(doc.run_id).toBe('run-123');
    expect(doc.experiment_id).toBe('exp-1');
    expect(doc.example).toEqual({
      id: 'example-1',
      index: 0,
      input: { question: 'one' },
      dataset: { id: 'dataset-1', name: 'Dataset 1' },
    });
    expect(doc.task).toEqual({
      trace_id: 'trace-task-1',
      repetition_index: 0,
      output: { answer: 'yes' },
      model: taskModel,
    });
    expect(doc.evaluator).toEqual({
      name: 'Correctness',
      score: 0.9,
      label: 'PASS',
      explanation: 'Correct.',
      metadata: null,
      trace_id: 'trace-eval-1',
      model: evaluatorModel,
    });
    expect(doc.run_metadata).toEqual({
      git_branch: 'main',
      git_commit_sha: 'abc123',
      total_repetitions: 3,
    });
    expect(doc.environment.hostname).toBe('test-host');
  });

  it('produces the same output as mapToEvaluationScoreDocuments for equivalent input', async () => {
    const experiment: RanExperiment = {
      id: 'exp-1',
      datasetId: 'dataset-1',
      datasetName: 'Dataset 1',
      runs: {
        'run-key-1': baseEvent.taskRun,
      },
      evaluationRuns: [baseEvent.evaluationRun],
    };

    const batchDocs = await mapToEvaluationScoreDocuments({
      experiments: [experiment],
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 3,
    });

    const singleDoc = buildSingleScoreDocument({
      event: baseEvent,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 3,
      timestamp: batchDocs[0]['@timestamp'],
      gitMetadata: {
        branch: batchDocs[0].run_metadata.git_branch,
        commitSha: batchDocs[0].run_metadata.git_commit_sha,
      },
      hostName: batchDocs[0].environment.hostname,
    });

    expect(singleDoc).toEqual(batchDocs[0]);
  });

  it('handles null/missing values correctly', () => {
    const sparseEvent: EvaluationCompleteEvent = {
      experimentId: 'exp-2',
      datasetId: 'ds-2',
      datasetName: 'DS 2',
      taskRun: {
        exampleIndex: 1,
        repetition: 0,
        input: undefined,
        expected: null,
        metadata: undefined,
        output: undefined,
      },
      evaluationRun: {
        name: 'Eval',
        experimentRunId: 'rk-1',
      },
      exampleId: '1',
    };

    const doc = buildSingleScoreDocument({
      event: sparseEvent,
      taskModel,
      evaluatorModel,
      runId: 'run-x',
      totalRepetitions: 1,
      timestamp: '2025-01-01T00:00:00Z',
      gitMetadata: { branch: null, commitSha: null },
      hostName: 'h',
    });

    expect(doc.example.input).toBeNull();
    expect(doc.task.output).toBeNull();
    expect(doc.task.trace_id).toBeNull();
    expect(doc.evaluator.score).toBeNull();
    expect(doc.evaluator.label).toBeNull();
    expect(doc.evaluator.explanation).toBeNull();
    expect(doc.evaluator.metadata).toBeNull();
    expect(doc.evaluator.trace_id).toBeNull();
  });
});
