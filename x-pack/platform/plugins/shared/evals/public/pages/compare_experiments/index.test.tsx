/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  ComparisonResult,
  EvaluationExperimentDatasetExample,
  GetEvaluationExperimentDatasetExamplesResponse,
} from '@kbn/evals-common';
import { useTraceSpans } from '@kbn/llm-trace-waterfall';
import {
  useCompareExperiments,
  useEvalsTraceFetcher,
  useEvaluationExperiment,
  useExperimentDatasetExamples,
  useExperimentExampleDetails,
} from '../../hooks/use_evals_api';
import { CompareExperimentsPage, ExampleDrilldownFlyout } from '.';

jest.mock('../../hooks/use_evals_api');
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: ({ traceId }: { traceId: string }) => <div>Trace {traceId}</div>,
  useTraceSpans: jest.fn(),
}));

const mockUseCompareExperiments = jest.mocked(useCompareExperiments);
const mockUseEvaluationExperiment = jest.mocked(useEvaluationExperiment);
const mockUseExperimentDatasetExamples = jest.mocked(useExperimentDatasetExamples);
const mockUseExperimentExampleDetails = jest.mocked(useExperimentExampleDetails);
const mockUseEvalsTraceFetcher = jest.mocked(useEvalsTraceFetcher);
const mockUseTraceSpans = jest.mocked(useTraceSpans);

const buildResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'dataset-1',
  datasetName: 'Dataset 1',
  evaluatorName: 'quality',
  sampleSize: 12,
  meanBaseline: 0.5,
  meanTarget: 0.7,
  pValue: 0.2,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 10 },
  ...overrides,
});

describe('CompareExperimentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEvaluationExperiment.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useEvaluationExperiment>);
    mockUseCompareExperiments.mockReturnValue({
      data: {
        results: [
          buildResult(),
          buildResult({
            evaluatorName: 'pass',
            meanBaseline: 0.5,
            meanTarget: 0.75,
            metricType: 'binary',
            hypothesisTest: {
              id: 'mcnemar',
              method: 'mid-p',
              statistic: 1,
              discordantPairs: { targetOnly: 4, baselineOnly: 1 },
            },
          }),
        ],
        pairing: {
          totalPairs: 24,
          skippedMissingPairs: 0,
          skippedNullScores: 0,
          truncatedBaseline: false,
          truncatedTarget: false,
        },
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCompareExperiments>);
  });

  it('shows the test behind each row and the discordant pairs of binary rows', () => {
    render(
      <MemoryRouter initialEntries={['/compare?baseline=baseline&target=target']}>
        <CompareExperimentsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('columnheader', { name: 'Test' })).toBeInTheDocument();

    const qualityRow = screen.getByText('quality').closest('tr');
    const passRow = screen.getByText('pass').closest('tr');
    if (!qualityRow || !passRow) {
      throw new Error('Expected one row per evaluator');
    }
    expect(within(qualityRow).getByText('Wilcoxon')).toBeInTheDocument();
    expect(within(passRow).getByText('McNemar')).toBeInTheDocument();

    fireEvent.mouseOver(within(passRow).getByText('+0.250'));
    expect(
      screen.getByText(/4 examples score 1 only in target, 1 example score 1 only in baseline/)
    ).toBeInTheDocument();
  });
});

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
