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

const side = (mean: number) => ({ mean, used: 12, missing: 0, stability: null });

const buildResult = (overrides: Partial<ComparisonResult> = {}): ComparisonResult => ({
  datasetId: 'dataset-1',
  datasetName: 'Dataset 1',
  evaluatorName: 'quality',
  sampleSize: 12,
  baseline: side(0.5),
  target: side(0.7),
  pValue: 0.2,
  direction: 'maximize',
  metricType: 'continuous_bounded',
  hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 10 },
  repetitionWarning: false,
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
            baseline: side(0.5),
            target: side(0.75),
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
          repetitionPolicy: 'mean',
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

    expect(screen.queryByRole('columnheader', { name: /Stability/ })).not.toBeInTheDocument();
  });

  it('uses the policy from the URL and shows the repetition details of each row', () => {
    mockUseCompareExperiments.mockReturnValue({
      data: {
        results: [
          buildResult({
            repetitionWarning: true,
            baseline: { mean: 0.5, used: 36, missing: 0, stability: 0.1 },
            target: { mean: 0.7, used: 33, missing: 3, stability: null },
          }),
          buildResult({ evaluatorName: 'steady' }),
        ],
        pairing: {
          repetitionPolicy: 'median',
          totalPairs: 24,
          skippedMissingPairs: 0,
          skippedNullScores: 0,
          truncatedBaseline: false,
          truncatedTarget: false,
          rejectedSlices: [{ datasetName: 'Dataset 1', evaluatorName: 'latency' }],
        },
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCompareExperiments>);

    render(
      <MemoryRouter
        initialEntries={['/compare?baseline=baseline&target=target&repetition_policy=median']}
      >
        <CompareExperimentsPage />
      </MemoryRouter>
    );

    expect(mockUseCompareExperiments).toHaveBeenLastCalledWith(
      'experiment',
      'baseline',
      'target',
      'median'
    );
    expect(screen.getByText(/Repetition policy: median\./)).toBeInTheDocument();
    expect(screen.getByText(/N\*: some examples/)).toBeInTheDocument();
    expect(screen.getByText('Score outside [0, 1]: Dataset 1 / latency.')).toBeInTheDocument();

    const flaggedRow = screen.getByText('quality').closest('tr');
    const steadyRow = screen.getByText('steady').closest('tr');
    if (!flaggedRow || !steadyRow) {
      throw new Error('Expected one row per evaluator');
    }
    expect(within(steadyRow).getByText('12')).toBeInTheDocument();
    expect(within(flaggedRow).getByText('0.100 / -')).toBeInTheDocument();
    expect(within(steadyRow).getByText('- / -')).toBeInTheDocument();

    fireEvent.mouseOver(within(flaggedRow).getByText('12*'));
    expect(
      screen.getByText('Valid scores: 36 baseline, 33 target. Null scores: 0 baseline, 3 target.')
    ).toBeInTheDocument();

    // Swapping keeps the policy.
    fireEvent.click(screen.getByRole('button', { name: 'Swap baseline and target' }));
    expect(mockUseCompareExperiments).toHaveBeenLastCalledWith(
      'experiment',
      'target',
      'baseline',
      'median'
    );
  });

  it('shows what the route said when it rejects the comparison', () => {
    const message = 'repetition_policy=median needs scores in [0, 1].';
    mockUseCompareExperiments.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: Object.assign(new Error('Bad Request'), { request: {}, body: { message } }),
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCompareExperiments>);

    render(
      <MemoryRouter
        initialEntries={['/compare?baseline=baseline&target=target&repetition_policy=median']}
      >
        <CompareExperimentsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(message, { exact: false })).toBeInTheDocument();
  });

  it('sorts the rows by the baseline mean', () => {
    mockUseCompareExperiments.mockReturnValue({
      data: {
        results: [
          buildResult({ evaluatorName: 'high', baseline: side(0.9) }),
          buildResult({ evaluatorName: 'low', baseline: side(0.1) }),
        ],
        pairing: {},
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useCompareExperiments>);
    render(
      <MemoryRouter initialEntries={['/compare?baseline=baseline&target=target']}>
        <CompareExperimentsPage />
      </MemoryRouter>
    );
    const evaluators = () => screen.getAllByText(/^(high|low)$/).map((cell) => cell.textContent);

    expect(evaluators()).toEqual(['high', 'low']);
    fireEvent.click(screen.getByText('Mean baseline'));
    expect(evaluators()).toEqual(['low', 'high']);
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

  it('shows every repetition and marks only one-sided examples as excluded', () => {
    const exampleHint = /This example has no valid score in one of the experiments/;
    const example = (id: string, index: number, repetitions: number[]) => ({
      example_id: id,
      example_index: index,
      scores: repetitions.map((repetition) => buildScore(0.5, repetition)),
    });
    mockUseExperimentDatasetExamples.mockImplementation(
      (experimentId) =>
        ({
          data: {
            examples:
              experimentId === 'baseline'
                ? [example('example-1', 0, [0, 1]), example('example-2', 1, [0])]
                : [example('example-1', 0, [0, 2])],
          },
          isLoading: false,
        } as ReturnType<typeof useExperimentDatasetExamples>)
    );
    renderFlyout();

    // Repetition 3 exists only in target, for an example that baseline has too.
    const oneSidedRepetition = screen.getByText('example-1 (rep 3)');
    fireEvent.mouseOver(oneSidedRepetition);
    expect(screen.queryByText(exampleHint)).not.toBeInTheDocument();
    expect(oneSidedRepetition.closest('tr')).not.toHaveStyle({ opacity: '0.55' });

    const oneSidedExample = screen.getByText('example-2 (rep 1)');
    fireEvent.mouseOver(oneSidedExample);
    expect(screen.getByText(exampleHint)).toBeInTheDocument();
    expect(oneSidedExample.closest('tr')).toHaveStyle({ opacity: '0.55' });
  });
});
