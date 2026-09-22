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
import { ExampleScoresTable } from '../../components/example_scores_table';
import { useExperimentDatasetExamples } from '../../hooks/use_evals_api';
import { DatasetStatsAccordion } from '.';

jest.mock('../../hooks/use_evals_api');
jest.mock('../../components/example_scores_table', () => ({
  ExampleScoresTable: jest.fn(() => <div>Example scores table</div>),
}));

const mockUseExperimentDatasetExamples = jest.mocked(useExperimentDatasetExamples);
const mockExampleScoresTable = jest.mocked(ExampleScoresTable);
const refetchExamples = jest.fn();

const example: EvaluationExperimentDatasetExample = {
  example_id: 'example-1',
  example_index: 0,
  scores: [],
};

const preview: NonNullable<EvaluationExperimentDatasetExample['preview']> = {
  repetition_index: 0,
  input: { content: '{"prompt":"preview input"}', truncated: false },
  output: { content: '{"completion":"preview output"}', truncated: false },
};

const buildGroup = (datasetId: string) => ({
  datasetId,
  datasetName: `Dataset ${datasetId}`,
  exampleCount: 1,
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
            examples: options?.includePreviews ? [{ ...example, preview }] : [example],
          },
          isLoading: false,
          error: null,
          refetch: refetchExamples,
        } as unknown as ReturnType<typeof useExperimentDatasetExamples>)
    );
  });

  it('automatically requests previews and merges them into the unpaginated examples', () => {
    renderAccordion();

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
        examples: [{ ...example, preview }],
      }),
      expect.anything()
    );

    const tableProps = mockExampleScoresTable.mock.calls[0][0];
    expect(tableProps).not.toHaveProperty('page');
    expect(tableProps).not.toHaveProperty('perPage');
    expect(tableProps).not.toHaveProperty('total');
    expect(tableProps).not.toHaveProperty('onPageChange');
  });

  it('polls only the preview-free bulk request during a live run', () => {
    renderAccordion({ isRunning: true });

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
