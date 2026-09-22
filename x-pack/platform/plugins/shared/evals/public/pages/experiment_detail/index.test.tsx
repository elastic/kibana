/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useExperimentDatasetExamples } from '../../hooks/use_evals_api';
import { DatasetStatsAccordion } from '.';

jest.mock('../../hooks/use_evals_api');
jest.mock('../../components/example_scores_table', () => ({
  ExampleScoresTable: ({
    page,
    onPageChange,
  }: {
    page: number;
    onPageChange: (nextPage: number) => void;
  }) => (
    <div>
      <span>Examples page {page}</span>
      <button type="button" onClick={() => onPageChange(page + 1)}>
        Next examples page
      </button>
    </div>
  ),
}));

const mockUseExperimentDatasetExamples = jest.mocked(useExperimentDatasetExamples);
const refetchExamples = jest.fn();

const buildGroup = (datasetId: string) => ({
  datasetId,
  datasetName: `Dataset ${datasetId}`,
  exampleCount: 50,
  stats: [],
});

const renderAccordion = (
  props: Partial<React.ComponentProps<typeof DatasetStatsAccordion>> = {}
) => {
  const defaultProps: React.ComponentProps<typeof DatasetStatsAccordion> = {
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

  return render(
    <MemoryRouter>
      <DatasetStatsAccordion {...defaultProps} {...props} />
    </MemoryRouter>
  );
};

describe('DatasetStatsAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExperimentDatasetExamples.mockImplementation(
      (_experimentId, _datasetId, _executionId, options) =>
        ({
          data: {
            examples: [],
            page: options?.page ?? 1,
            per_page: 25,
            total: 50,
          },
          isLoading: false,
          error: null,
          refetch: refetchExamples,
        } as unknown as ReturnType<typeof useExperimentDatasetExamples>)
    );
  });

  it('requests the active page and resets to page one when dataset or experiment changes', async () => {
    const { rerender } = renderAccordion();

    fireEvent.click(screen.getByRole('button', { name: 'Next examples page' }));
    expect(screen.getByText('Examples page 2')).toBeInTheDocument();
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      expect.objectContaining({ page: 2 })
    );

    rerender(
      <MemoryRouter>
        <DatasetStatsAccordion
          experimentId="experiment-1"
          executionId="execution-1"
          group={buildGroup('dataset-2')}
          statsColumns={[]}
          experimentLoading={false}
          isOpen
          isRunning={false}
          datasetExists={false}
          selectedExampleId={null}
          onTraceClick={jest.fn()}
          onDatasetToggle={jest.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Examples page 1')).toBeInTheDocument());
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-2',
      'execution-1',
      expect.objectContaining({ page: 1 })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next examples page' }));
    rerender(
      <MemoryRouter>
        <DatasetStatsAccordion
          experimentId="experiment-2"
          executionId="execution-1"
          group={buildGroup('dataset-2')}
          statsColumns={[]}
          experimentLoading={false}
          isOpen
          isRunning={false}
          datasetExists={false}
          selectedExampleId={null}
          onTraceClick={jest.fn()}
          onDatasetToggle={jest.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Examples page 1')).toBeInTheDocument());
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-2',
      'dataset-2',
      'execution-1',
      expect.objectContaining({ page: 1 })
    );
  });

  it('polls only the currently mounted summary page during a live run', () => {
    renderAccordion({ isRunning: true });

    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { page: 1, refetchInterval: 3000, staleTime: 0 }
    );
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { page: 1, includePreviews: true }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next examples page' }));

    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { page: 2, refetchInterval: 3000, staleTime: 0 }
    );
    expect(mockUseExperimentDatasetExamples).toHaveBeenCalledWith(
      'experiment-1',
      'dataset-1',
      'execution-1',
      { page: 2, includePreviews: true }
    );
  });
});
