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
  evaluatorLabel,
  evaluatorExplanation,
  evaluatorMetadata,
  evaluatorTraceId,
  repetitionIndex,
  exampleInput,
  taskOutput,
}: {
  timestamp: string;
  traceId?: string | null;
  evaluatorName: string;
  evaluatorScore?: number | null;
  evaluatorLabel?: string | null;
  evaluatorExplanation?: string | null;
  evaluatorMetadata?: Record<string, unknown> | null;
  evaluatorTraceId?: string | null;
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
    label: evaluatorLabel,
    explanation: evaluatorExplanation,
    metadata: evaluatorMetadata,
    trace_id: evaluatorTraceId,
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
  it('renders repetition navigation and inline JSON previews for multi-repetition rows', () => {
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

    expect(screen.getByText('example-id-00000...')).toBeInTheDocument();

    const pagination = screen.getByRole('navigation', {
      name: 'Select repetition for example example-id-0000000000000001',
    });
    expect(pagination).toBeInTheDocument();

    expect(screen.getByText(/"prompt": "input-r1"/)).toBeInTheDocument();
    expect(screen.getByText(/"completion": "output-r1"/)).toBeInTheDocument();
    expect(screen.getByText('Criteria:')).toBeInTheDocument();
    expect(screen.getByText('0.95')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000001',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith('6d8639157ac4141c0000000000000001');

    const nextPageButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextPageButton);
    expect(screen.getByText('0.10')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open trace 6d8639157ac4141c0000000000000002',
      })
    );
    expect(onTraceClick).toHaveBeenCalledWith('6d8639157ac4141c0000000000000002');
  });

  it('does not render repetition pagination for single-repetition rows', () => {
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

    expect(
      screen.queryByRole('navigation', {
        name: 'Select repetition for example example-id-single-repetition',
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('example-id-singl...')).toBeInTheDocument();
  });

  it('renders evaluator label as a badge when present', () => {
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-with-label',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Factuality',
            evaluatorScore: 0.8,
            evaluatorLabel: 'ACCURATE',
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('Factuality:')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
    expect(screen.getByText('ACCURATE')).toBeInTheDocument();
  });

  it('shows explanation and metadata when accordion is expanded', () => {
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-with-details',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Relevance',
            evaluatorScore: 0.9,
            evaluatorExplanation: 'The response is highly relevant.',
            evaluatorMetadata: { reason: 'matches topic' },
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('Relevance:')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();

    const accordion = screen.getByLabelText('Toggle details for evaluator Relevance');
    const accordionButton = accordion.querySelector('.euiAccordion__button') as HTMLButtonElement;
    fireEvent.click(accordionButton);

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('The response is highly relevant.')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText(/"reason": "matches topic"/)).toBeInTheDocument();
  });

  it('shows evaluator trace button when evaluator trace_id is present', () => {
    const onTraceClick = jest.fn();
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-with-eval-trace',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'Criteria',
            evaluatorScore: 0.7,
            evaluatorTraceId: 'eval-trace-abc123',
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={onTraceClick} />);

    const accordion = screen.getByLabelText('Toggle details for evaluator Criteria');
    const accordionButton = accordion.querySelector('.euiAccordion__button') as HTMLButtonElement;
    fireEvent.click(accordionButton);

    const viewTraceButton = screen.getByRole('button', {
      name: 'View trace for evaluator Criteria',
    });
    fireEvent.click(viewTraceButton);

    expect(onTraceClick).toHaveBeenCalledWith('eval-trace-abc123');
  });

  it('does not render accordion when no details are available', () => {
    const examples: EvaluationRunDatasetExample[] = [
      {
        example_id: 'example-no-details',
        example_index: 0,
        scores: [
          buildScore({
            timestamp: '2026-03-02T12:00:00.000Z',
            evaluatorName: 'SimpleScore',
            evaluatorScore: 1.0,
            repetitionIndex: 0,
          }),
        ],
      },
    ];

    render(<ExampleScoresTable examples={examples} onTraceClick={jest.fn()} />);

    expect(screen.getByText('SimpleScore:')).toBeInTheDocument();
    expect(screen.getByText('1.00')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Toggle details for evaluator SimpleScore')
    ).not.toBeInTheDocument();
  });
});
