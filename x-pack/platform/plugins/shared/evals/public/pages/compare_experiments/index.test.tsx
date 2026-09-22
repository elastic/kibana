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
  task: {
    repetition_index: repetitionIndex,
    trace_id: traceId,
  },
  evaluator: {
    name: 'quality',
    score,
  },
});

const buildResponse = (
  experimentId: string,
  page: number
): GetEvaluationExperimentDatasetExamplesResponse => {
  if (page === 2) {
    return {
      examples: [
        {
          example_id: 'example-26',
          example_index: 25,
          scores: [buildScore(experimentId === 'baseline' ? 0.4 : 0.8)],
        },
      ],
      page,
      per_page: 25,
      total: 26,
    };
  }

  return {
    examples: Array.from({ length: 25 }, (_, index) => {
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
    page,
    per_page: 25,
    total: 26,
  };
};

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
      (experimentId, _datasetId, _executionId, options) =>
        ({
          data: buildResponse(experimentId, options?.page ?? 1),
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

  it('pages both compact arms together while preserving missing pairs and trace actions', () => {
    const { container } = renderFlyout();

    expect(container.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(screen.getByText('example-1 (rep 1)')).toBeInTheDocument();
    expect(screen.getByText('example-2 (rep 1)')).toBeInTheDocument();
    expect(screen.getByText('example-3 (rep 2)')).toBeInTheDocument();

    const baselineOnlyRow = screen.getByText('example-1 (rep 1)').closest('tr');
    const targetOnlyRow = screen.getByText('example-2 (rep 1)').closest('tr');
    expect(baselineOnlyRow).not.toBeNull();
    expect(targetOnlyRow).not.toBeNull();
    expect(within(baselineOnlyRow!).getAllByRole('cell')[1]).toHaveTextContent('0.200');
    expect(within(baselineOnlyRow!).getAllByRole('cell')[2]).toHaveTextContent('-');
    expect(within(targetOnlyRow!).getAllByRole('cell')[1]).toHaveTextContent('-');
    expect(within(targetOnlyRow!).getAllByRole('cell')[2]).toHaveTextContent('0.700');

    const pairedRow = screen.getByText('example-4 (rep 1)').closest('tr');
    expect(pairedRow).not.toBeNull();
    expect(within(pairedRow!).getAllByRole('cell')[3]).toHaveTextContent('+0.500');

    expect(screen.getByRole('button', { name: 'View trace (baseline)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View trace (target)' })).toBeInTheDocument();

    const initialCalls = mockUseExperimentDatasetExamples.mock.calls;
    expect(initialCalls).toEqual(
      expect.arrayContaining([
        ['baseline', 'dataset-1', undefined, { page: 1 }],
        ['target', 'dataset-1', undefined, { page: 1 }],
      ])
    );
    expect(initialCalls.every(([, , , options]) => options?.includePreviews === undefined)).toBe(
      true
    );

    const pagination = screen.getByRole('navigation', {
      name: 'Per-example comparison pages',
    });
    fireEvent.click(within(pagination).getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('example-26')).toBeInTheDocument();
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'baseline',
      'dataset-1',
      undefined,
      { page: 2 }
    );
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'target',
      'dataset-1',
      undefined,
      { page: 2 }
    );
    expect(mockUseExperimentExampleDetails).not.toHaveBeenCalled();
  });
});
