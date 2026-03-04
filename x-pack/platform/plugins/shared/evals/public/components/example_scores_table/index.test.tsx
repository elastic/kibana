/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EvaluationRunDatasetExample } from '@kbn/evals-common';
import { ExampleScoresTable } from '.';

const buildScore = ({
  timestamp,
  traceId,
  evaluatorName,
  evaluatorScore,
  repetitionIndex,
  exampleInput,
  taskOutput,
}: {
  timestamp: string;
  traceId?: string | null;
  evaluatorName: string;
  evaluatorScore?: number | null;
  repetitionIndex: number;
  exampleInput?: Record<string, unknown> | null;
  taskOutput?: Record<string, unknown> | null;
}): EvaluationRunDatasetExample['scores'][number] => ({
  '@timestamp': timestamp,
  run_id: 'run-1',
  experiment_id: 'experiment-1',
  example: {
    id: 'example-1',
    index: 2,
    input: exampleInput ?? null,
    dataset: {
      id: 'dataset-1',
      name: 'dataset name',
    },
  },
  task: {
    trace_id: traceId,
    repetition_index: repetitionIndex,
    output: taskOutput ?? null,
    model: {
      id: 'task-model-1',
    },
  },
  evaluator: {
    name: evaluatorName,
    score: evaluatorScore,
    model: {
      id: 'evaluator-model-1',
    },
  },
  run_metadata: {
    total_repetitions: 1,
  },
  environment: {},
});

describe('ExampleScoresTable', () => {
  it('renders repetition navigation and JSON accordions for multi-repetition rows', () => {
    const onTraceClick = jest.fn();
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-id-0000000000000001',
        example_index: 2,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            traceId: '6d8639157ac4141c0000000000000001',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.95,
            repetitionIndex: 0,
            exampleInput: { prompt: 'input-r1' },
            taskOutput: { completion: 'output-r1' },
          }),
          buildScore({
            timestamp: '2026-03-02T12:00:02.000Z',
            traceId: '6d8639157ac4141c0000000000000002',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.1,
            repetitionIndex: 1,
            exampleInput: { prompt: 'input-r2' },
            taskOutput: { completion: 'output-r2' },
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={onTraceClick} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('example-id-00000...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'R2' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View JSON' })).toHaveLength(2);
    expect(screen.getByText('Criteria: 0.95')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000001',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith('6d8639157ac4141c0000000000000001');

    fireEvent.click(screen.getByRole('button', { name: 'R2' }));
    expect(screen.getByText('Criteria: 0.10')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000002',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith('6d8639157ac4141c0000000000000002');
  });

  it('renders a static repetition label for single-repetition rows', () => {
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-id-single-repetition',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            traceId: '6d8639157ac4141c0000000000000100',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.5,
            repetitionIndex: 0,
            exampleInput: { prompt: 'single-input' },
            taskOutput: { completion: 'single-output' },
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('R1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'R1' })).not.toBeInTheDocument();
  });
});
