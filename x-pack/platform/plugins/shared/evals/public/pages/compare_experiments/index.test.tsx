/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  EvaluationExperimentDatasetExample,
  GetEvaluationExperimentDatasetExamplesResponse,
} from '@kbn/evals-common';
import { useTraceSpans } from '@kbn/llm-trace-waterfall';
import {
  useEvalsTraceFetcher,
  useExperimentDatasetExamples,
  useExperimentExampleDetails,
} from '../../hooks/use_evals_api';
import { ExampleDrilldownFlyout } from '.';

jest.mock('../../hooks/use_evals_api');
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: ({ traceId }: { traceId: string }) => <div>Trace {traceId}</div>,
  useTraceSpans: jest.fn(),
}));

const mockUseExperimentDatasetExamples = jest.mocked(useExperimentDatasetExamples);
const mockUseExperimentExampleDetails = jest.mocked(useExperimentExampleDetails);
const mockUseEvalsTraceFetcher = jest.mocked(useEvalsTraceFetcher);
const mockUseTraceSpans = jest.mocked(useTraceSpans);

const buildScore = (
  score: number,
  repetitionIndex = 0,
  traceId?: string
): EvaluationExperimentDatasetExample['scores'][number] => ({
  '@timestamp': '2026-09-22T12:00:00.000Z',
  experiment_id: 'experiment-1',
  example: {
    id: 'example-1',
    index: 0,
    dataset: {
      id: 'dataset-1',
      name: 'Dataset 1',
    },
  },
  task: {
    repetition_index: repetitionIndex,
    trace_id: traceId,
    model: { id: 'task-model-1' },
  },
  evaluator: {
    name: 'quality',
    score,
  },
  metadata: {
    total_repetitions: 2,
  },
});

const buildResponse = (experimentId: string): GetEvaluationExperimentDatasetExamplesResponse => ({
  examples: Array.from({ length: 4 }, (_, index) => {
    const exampleNumber = index + 1;
    const isBaseline = experimentId === 'baseline';
    const scores =
      (isBaseline && exampleNumber === 2) || (!isBaseline && exampleNumber === 1)
        ? []
        : [
            buildScore(
              isBaseline ? 0.2 : 0.7,
              exampleNumber === 3 ? 1 : 0,
              exampleNumber === 4 ? `${isBaseline ? 'baseline' : 'target'}-trace` : undefined
            ),
          ];
    return {
      example_id: `example-${exampleNumber}`,
      example_index: index,
      scores,
    };
  }),
});

const renderFlyout = () =>
  render(
    <ExampleDrilldownFlyout
      baselineExperimentId="baseline"
      targetExperimentId="target"
      datasetId="dataset-1"
      datasetName="Dataset 1"
      evaluatorName="quality"
      direction="maximize"
      onClose={jest.fn()}
    />
  );

describe('ExampleDrilldownFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExperimentDatasetExamples.mockImplementation(
      (experimentId) =>
        ({
          data: buildResponse(experimentId),
          isLoading: false,
        } as ReturnType<typeof useExperimentDatasetExamples>)
    );
    mockUseEvalsTraceFetcher.mockReturnValue(jest.fn());
    mockUseTraceSpans.mockReturnValue({
      spans: [],
      durationMs: 0,
      isLoading: false,
      error: null,
    });
  });

  it('loads both arms unpaginated without previews or details and preserves pairing and traces', () => {
    const { container } = renderFlyout();

    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(screen.getByText('example-1 (rep 1)')).toBeInTheDocument();
    expect(screen.getByText('example-2 (rep 1)')).toBeInTheDocument();
    expect(screen.getByText('example-3 (rep 2)')).toBeInTheDocument();

    const baselineOnlyRow = screen.getByText('example-1 (rep 1)').closest('tr');
    const targetOnlyRow = screen.getByText('example-2 (rep 1)').closest('tr');
    if (!baselineOnlyRow || !targetOnlyRow) {
      throw new Error('Expected baseline-only and target-only comparison rows');
    }
    expect(within(baselineOnlyRow).getAllByRole('cell')[1]).toHaveTextContent('0.200');
    expect(within(baselineOnlyRow).getAllByRole('cell')[2]).toHaveTextContent('-');
    expect(within(targetOnlyRow).getAllByRole('cell')[1]).toHaveTextContent('-');
    expect(within(targetOnlyRow).getAllByRole('cell')[2]).toHaveTextContent('0.700');

    const pairedRow = screen.getByText('example-4 (rep 1)').closest('tr');
    if (!pairedRow) {
      throw new Error('Expected paired comparison row');
    }
    expect(within(pairedRow).getAllByRole('cell')[3]).toHaveTextContent('+0.500');

    expect(screen.getByRole('button', { name: 'View trace (baseline)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View trace (target)' })).toBeInTheDocument();

    expect(mockUseExperimentDatasetExamples.mock.calls).toEqual([
      ['baseline', 'dataset-1', undefined],
      ['target', 'dataset-1', undefined],
    ]);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(mockUseExperimentExampleDetails).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'View trace (baseline)' }));
    expect(screen.getByText('Trace baseline-trace')).toBeInTheDocument();
  });
});
