/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EvaluationExperimentDatasetExample } from '@kbn/evals-common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExampleScoresTable } from '../../components/example_scores_table';
import { useExperimentDatasetExamples } from '../../hooks/use_evals_api';
import { queryKeys } from '../../query_keys';
import { DatasetStatsAccordion } from '.';

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
