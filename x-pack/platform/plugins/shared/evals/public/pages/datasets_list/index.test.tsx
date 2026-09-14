/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DatasetsListPage } from '.';
import { useCreateDataset, useDatasets, useDatasetTagSuggestions } from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useAccessibleSpaces } from '../../hooks/use_spaces';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));
jest.mock('../../hooks/use_evals_api');
jest.mock('../../hooks/use_evals_permissions');
jest.mock('../../hooks/use_spaces');
jest.mock('../../components/copy_dataset_flyout', () => ({
  CopyDatasetFlyout: ({ datasetId, datasetName }: { datasetId: string; datasetName: string }) => (
    <div data-test-subj="copyDatasetFlyoutMock">
      {datasetId}: {datasetName}
    </div>
  ),
}));
jest.mock('../../components/import_dataset_flyout', () => ({
  ImportDatasetFlyout: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="importDatasetFlyoutMock">
      <button type="button" onClick={onClose}>
        Close import
      </button>
    </div>
  ),
}));

const mockedUseKibana = jest.mocked(useKibana);
const mockedUseDatasets = jest.mocked(useDatasets);
const mockedUseCreateDataset = jest.mocked(useCreateDataset);
const mockedUseDatasetTagSuggestions = jest.mocked(useDatasetTagSuggestions);
const mockedUseEvalsPermissions = jest.mocked(useEvalsPermissions);
const mockedUseAccessibleSpaces = jest.mocked(useAccessibleSpaces);

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/datasets'] });
  return render(
    <Router history={history}>
      <DatasetsListPage />
    </Router>
  );
};

describe('DatasetsListPage dataset actions', () => {
  beforeEach(() => {
    mockedUseKibana.mockReturnValue({ services: {} } as ReturnType<typeof useKibana>);
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: true });
    mockedUseAccessibleSpaces.mockReturnValue({
      isEnabled: false,
      isLoading: false,
      activeSpaceId: undefined,
      spaces: [],
    });
    mockedUseDatasetTagSuggestions.mockReturnValue([]);
    mockedUseCreateDataset.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateDataset>);
    mockedUseDatasets.mockReturnValue({
      data: {
        datasets: [
          {
            id: 'dataset-1',
            name: 'Dataset one',
            description: 'Description',
            examples_count: 1,
            created_at: '2026-09-04T10:00:00.000Z',
            updated_at: '2026-09-04T10:00:00.000Z',
          },
        ],
        total: 1,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useDatasets>);
  });

  it('opens the copy flyout for the selected dataset', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('copyDatasetButton'));

    expect(screen.getByTestId('copyDatasetFlyoutMock')).toHaveTextContent('dataset-1: Dataset one');
  });

  it('does not render the copy button without manage privilege', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });

    renderPage();

    expect(screen.queryByTestId('copyDatasetButton')).not.toBeInTheDocument();
  });

  it('opens the import flyout when the user can manage datasets', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('importDatasetFileButton'));

    expect(screen.getByTestId('importDatasetFlyoutMock')).toBeInTheDocument();
  });

  it('does not render the import button without manage privilege', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });

    renderPage();

    expect(screen.queryByTestId('importDatasetFileButton')).not.toBeInTheDocument();
  });
});
