/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiBasicTable } from '@elastic/eui';
import { MemoryRouter } from 'react-router-dom';
import type { EvaluationExperimentDatasetExample, EvaluatorStats } from '@kbn/evals-common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExampleScoresTable } from '../../components/example_scores_table';
import { useExperimentDatasetExamples } from '../../hooks/use_evals_api';
import { queryKeys } from '../../query_keys';
import {
  DatasetStatsAccordion,
  formatStat,
  MeanWithErrors,
  statValueColumns,
  sumScoresIngested,
} from '.';

jest.mock('../../hooks/use_evals_api');
jest.mock('../../components/example_scores_table', () => ({
  ExampleScoresTable: jest.fn(() => <div>Example scores table</div>),
}));

const mockUseExperimentDatasetExamples = jest.mocked(useExperimentDatasetExamples);
const mockExampleScoresTable = jest.mocked(ExampleScoresTable);
const refetchExamples = jest.fn();
const refetchPreviews = jest.fn();

const previewQueryKey = queryKeys.experiments.datasetExamples(
  'experiment-1',
  'dataset-1',
  'execution-1',
  true
);

const example: EvaluationExperimentDatasetExample = {
  example_id: 'example-1',
  example_index: 0,
  scores: [],
};

const previews: NonNullable<EvaluationExperimentDatasetExample['previews']> = [
  {
    repetition_index: 0,
    input: { content: '{"prompt":"preview input"}', truncated: false },
    output: { content: '{"completion":"preview output"}', truncated: false },
  },
];

const buildGroup = (datasetId: string) => ({
  datasetId,
  datasetName: `Dataset ${datasetId}`,
  exampleCount: 1,
  stats: [],
});

const defaultAccordionProps: React.ComponentProps<typeof DatasetStatsAccordion> = {
  experimentId: 'experiment-1',
  executionId: 'execution-1',
  group: buildGroup('dataset-1'),
  statsColumns: [],
  experimentLoading: false,
  isOpen: true,
  isRunning: false,
  datasetExists: false,
  selectedExampleId: null,
  onTraceClick: jest.fn(),
  onDatasetToggle: jest.fn(),
};

const renderAccordion = (
  queryClient: QueryClient,
  props: Partial<React.ComponentProps<typeof DatasetStatsAccordion>> = {}
) => {
  const accordionProps = { ...defaultAccordionProps, ...props };
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DatasetStatsAccordion {...accordionProps} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('DatasetStatsAccordion', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.spyOn(queryClient, 'invalidateQueries');
    mockUseExperimentDatasetExamples.mockImplementation(
      (_experimentId, _datasetId, _executionId, options) =>
        ({
          data: {
            examples: options?.includePreviews ? [{ ...example, previews }] : [example],
          },
          isLoading: false,
          error: null,
          refetch: options?.includePreviews ? refetchPreviews : refetchExamples,
        } as unknown as ReturnType<typeof useExperimentDatasetExamples>)
    );
  });

  it('automatically requests previews and merges them into the unpaginated examples', () => {
    renderAccordion(queryClient);

    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledTimes(2);
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { refetchInterval: false, staleTime: undefined }
    );
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { includePreviews: true }
    );
    expect(mockExampleScoresTable).toHaveBeenCalledWith(
      expect.objectContaining({
        experimentId: 'experiment-1',
        datasetId: 'dataset-1',
        executionId: 'execution-1',
        examples: [{ ...example, previews }],
      }),
      expect.anything()
    );

    const tableProps = mockExampleScoresTable.mock.calls[0][0];
    expect(tableProps).not.toHaveProperty('page');
    expect(tableProps).not.toHaveProperty('perPage');
    expect(tableProps).not.toHaveProperty('total');
    expect(tableProps).not.toHaveProperty('onPageChange');
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(refetchPreviews).not.toHaveBeenCalled();
  });

  it('refreshes previews once when a live run settles', () => {
    const { rerender } = renderAccordion(queryClient, { isRunning: true });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DatasetStatsAccordion {...defaultAccordionProps} isRunning={false} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(refetchExamples).toHaveBeenCalledTimes(1);
    expect(refetchPreviews).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: previewQueryKey });
  });

  it('invalidates previews without refetching scores when a collapsed run settles', () => {
    const { rerender } = renderAccordion(queryClient, { isRunning: true, isOpen: false });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DatasetStatsAccordion {...defaultAccordionProps} isRunning={false} isOpen={false} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(refetchExamples).not.toHaveBeenCalled();
    expect(refetchPreviews).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: previewQueryKey });
  });

  it('polls only the preview-free bulk request during a live run', () => {
    renderAccordion(queryClient, { isRunning: true });

    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { refetchInterval: 3000, staleTime: 0 }
    );
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { includePreviews: true }
    );

    const pollingCalls = mockUseExperimentDatasetExamples.mock.calls.filter(
      ([, , , options]) => options?.refetchInterval === 3000
    );
    expect(pollingCalls).toHaveLength(1);
    expect(pollingCalls[0][3]?.includePreviews).not.toBe(true);
  });
});

describe('sumScoresIngested', () => {
  const buildStat = (count: number, errorCount?: number): EvaluatorStats => ({
    dataset_id: 'dataset-1',
    dataset_name: 'Dataset 1',
    evaluator_name: 'evaluator',
    example_count: 1,
    stats: {
      mean: 0,
      median: 0,
      std_dev: 0,
      min: 0,
      max: 0,
      count,
      ...(errorCount !== undefined && { error_count: errorCount }),
    },
  });

  it('counts errored scores alongside scored ones', () => {
    expect(sumScoresIngested([buildStat(3, 2), buildStat(4)])).toBe(9);
  });
});

describe('MeanWithErrors', () => {
  it('shows the error count next to the mean', () => {
    const { getByTestId, container } = render(
      <MeanWithErrors mean={0.5} count={3} errorCount={2} />
    );

    expect(container.textContent).toContain('0.50');
    expect(getByTestId('evalsExperimentDetailMeanErrorCount').textContent).toContain('2 errors');
  });

  it('shows only the mean when there are no errors', () => {
    const { queryByTestId, container } = render(
      <MeanWithErrors mean={0.5} count={3} errorCount={0} />
    );

    expect(container.textContent).toBe('0.50');
    expect(queryByTestId('evalsExperimentDetailMeanErrorCount')).toBeNull();
  });

  it('shows a placeholder, not 0.00, when every run errored', () => {
    const { getByTestId, container } = render(<MeanWithErrors mean={0} count={0} errorCount={4} />);

    expect(container.textContent).not.toContain('0.00');
    expect(container.textContent).toContain('-');
    expect(getByTestId('evalsExperimentDetailMeanErrorCount').textContent).toContain('4 errors');
  });
});

describe('formatStat', () => {
  it('formats a scored stat to two decimals', () => {
    expect(formatStat(0.456, 3)).toBe('0.46');
    expect(formatStat(0, 3)).toBe('0.00');
  });

  it('returns the placeholder when there are no scored runs', () => {
    expect(formatStat(0, 0)).toBe('-');
  });
});

describe('statValueColumns', () => {
  const buildRow = (stats: Partial<EvaluatorStats['stats']>): EvaluatorStats => ({
    dataset_id: 'dataset-1',
    dataset_name: 'Dataset 1',
    evaluator_name: 'Factuality',
    example_count: 1,
    stats: { mean: 0, median: 0, std_dev: 0, min: 0, max: 0, count: 0, ...stats },
  });

  it('renders placeholders, not 0.00, in every stat column when every run errored', () => {
    const { container, getByTestId } = render(
      <EuiBasicTable
        tableCaption="stats"
        items={[buildRow({ error_count: 3 })]}
        columns={statValueColumns}
      />
    );

    expect(container.textContent).not.toContain('0.00');
    expect(container.querySelectorAll('td')).toHaveLength(5);
    expect(getByTestId('evalsExperimentDetailMeanErrorCount').textContent).toContain('3 errors');
  });

  it('renders numeric values when runs were scored', () => {
    const { container } = render(
      <EuiBasicTable
        tableCaption="stats"
        items={[buildRow({ mean: 0.5, median: 0.4, std_dev: 0.1, min: 0.2, max: 0.9, count: 4 })]}
        columns={statValueColumns}
      />
    );

    expect(container.textContent).toContain('0.50');
    expect(container.textContent).toContain('0.90');
  });
});
