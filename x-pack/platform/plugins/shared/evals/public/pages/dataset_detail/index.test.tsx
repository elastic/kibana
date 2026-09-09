/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { DatasetDetailPage } from '.';
import {
  useAddExamples,
  useDataset,
  useDatasetTagSuggestions,
  useDeleteExample,
  useEvalsTraceFetcher,
  useExampleScores,
  useEvaluationExperiments,
  useUpdateDataset,
  useUpdateExample,
} from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';

jest.mock('../../hooks/use_evals_api');
jest.mock('../../hooks/use_evals_permissions');
jest.mock('@kbn/code-editor', () => ({ CodeEditor: () => null }));
jest.mock('@kbn/llm-trace-waterfall', () => ({
  TraceWaterfall: () => null,
  useTraceSpans: () => ({
    spans: [],
    durationMs: 0,
    isLoading: false,
    error: undefined,
  }),
}));
jest.mock('../../components/copy_dataset_flyout', () => ({
  CopyDatasetFlyout: ({ datasetId, datasetName }: { datasetId: string; datasetName: string }) => (
    <div data-test-subj="copyDatasetFlyoutMock">
      {datasetId}: {datasetName}
    </div>
  ),
}));
jest.mock('../../components/import_dataset_flyout', () => ({
  ImportDatasetFlyout: ({
    initialDataset,
    onClose,
  }: {
    initialDataset?: { id: string };
    onClose: () => void;
  }) => (
    <div data-test-subj="importDatasetFlyoutMock">
      <span>{initialDataset?.id}</span>
      <button type="button" onClick={onClose}>
        Close import
      </button>
    </div>
  ),
}));
jest.mock('../../components/dataset_spaces', () => ({
  DatasetSharedNotice: () => null,
  DatasetSpacesBadge: () => null,
  DatasetSpacesPicker: () => null,
  SharedChangeConfirmModal: () => null,
  getRemovedSpaceIds: () => [],
  useDatasetSharing: () => ({
    isEnabled: false,
    isShared: false,
    activeSpaceId: undefined,
  }),
}));

const mockedUseDataset = jest.mocked(useDataset);
const mockedUseDatasetTagSuggestions = jest.mocked(useDatasetTagSuggestions);
const mockedUseEvalsPermissions = jest.mocked(useEvalsPermissions);
const mockedUseEvaluationExperiments = jest.mocked(useEvaluationExperiments);
const mockedUseAddExamples = jest.mocked(useAddExamples);
const mockedUseUpdateDataset = jest.mocked(useUpdateDataset);
const mockedUseUpdateExample = jest.mocked(useUpdateExample);
const mockedUseDeleteExample = jest.mocked(useDeleteExample);
const mockedUseEvalsTraceFetcher = jest.mocked(useEvalsTraceFetcher);
const mockedUseExampleScores = jest.mocked(useExampleScores);

const mutationResult = {
  mutateAsync: jest.fn(),
  isLoading: false,
};

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/datasets/dataset-1'] });
  return render(
    <Router history={history}>
      <Route path="/datasets/:datasetId">
        <DatasetDetailPage />
      </Route>
    </Router>
  );
};

describe('DatasetDetailPage dataset actions', () => {
  beforeEach(() => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: true });
    mockedUseDataset.mockReturnValue({
      data: {
        id: 'dataset-1',
        name: 'Dataset one',
        description: '',
        examples: [],
        created_at: '2026-09-04T10:00:00.000Z',
        updated_at: '2026-09-04T10:00:00.000Z',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDataset>);
    mockedUseEvaluationExperiments.mockReturnValue({
      data: { experiments: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useEvaluationExperiments>);
    mockedUseDatasetTagSuggestions.mockReturnValue([]);
    mockedUseUpdateDataset.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useUpdateDataset>
    );
    mockedUseAddExamples.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useAddExamples>
    );
    mockedUseUpdateExample.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useUpdateExample>
    );
    mockedUseDeleteExample.mockReturnValue(
      mutationResult as unknown as ReturnType<typeof useDeleteExample>
    );
    mockedUseEvalsTraceFetcher.mockReturnValue(jest.fn());
    mockedUseExampleScores.mockReturnValue({
      data: { scores: [], total: 0 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useExampleScores>);
  });

  it('opens the copy flyout with the current dataset', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('copyDatasetButton'));

    expect(screen.getByTestId('copyDatasetFlyoutMock')).toHaveTextContent('dataset-1: Dataset one');
  });

  it('does not render the copy button without manage privilege', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });

    renderPage();

    expect(screen.queryByTestId('copyDatasetButton')).not.toBeInTheDocument();
  });

  it('opens the import flyout with the current dataset selected', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('importDatasetFileButton'));

    expect(screen.getByTestId('importDatasetFlyoutMock')).toHaveTextContent('dataset-1');
  });

  it('does not render the import button without manage privilege', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });

    renderPage();

    expect(screen.queryByTestId('importDatasetFileButton')).not.toBeInTheDocument();
  });
});
