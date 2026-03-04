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
}: {
  timestamp: string;
  traceId?: string | null;
  evaluatorName: string;
  evaluatorScore?: number | null;
  repetitionIndex: number;
}) => ({
  '@timestamp': timestamp,
  run_id: 'run-1',
  experiment_id: 'experiment-1',
  example: {
    id: 'example-1',
    index: 2,
    dataset: {
      id: 'dataset-1',
      name: 'dataset name',
    },
  },
  task: {
    trace_id: traceId,
    repetition_index: repetitionIndex,
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
  it('renders example rows with evaluator scores and trace buttons', () => {
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
          }),
          buildScore({
            timestamp: '2026-03-02T12:00:01.000Z',
            traceId: '6d8639157ac4141c0000000000000001',
            evaluatorName: 'Correctness',
            evaluatorScore: null,
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={onTraceClick} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('example-id-00000...')).toBeInTheDocument();
    expect(screen.getByText('Criteria: 0.95')).toBeInTheDocument();
    expect(screen.getByText('Correctness: n/a')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000001',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith('6d8639157ac4141c0000000000000001');
  });
});
