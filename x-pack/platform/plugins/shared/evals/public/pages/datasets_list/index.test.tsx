/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DatasetsListPage } from '.';
import { useCreateDataset, useDatasets, useDatasetTagSuggestions } from '../../hooks/use_evals_api';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useAccessibleSpaces } from '../../hooks/use_spaces';

vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/kibana-react-plugin/public')),
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../hooks/use_evals_api');
vi.mock('../../hooks/use_evals_permissions');
vi.mock('../../hooks/use_spaces');
vi.mock('../../components/copy_dataset_flyout', () => {
  const mocked = {
    CopyDatasetFlyout: ({ datasetId, datasetName }: { datasetId: string; datasetName: string }) => (
      <div data-test-subj="copyDatasetFlyoutMock">
        {datasetId}: {datasetName}
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../components/import_dataset_flyout', () => {
  const mocked = {
    ImportDatasetFlyout: ({ onClose }: { onClose: () => void }) => (
      <div data-test-subj="importDatasetFlyoutMock">
        <button type="button" onClick={onClose}>
          Close import
        </button>
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});

const mockedUseKibana = vi.mocked(useKibana);
const mockedUseDatasets = vi.mocked(useDatasets);
const mockedUseCreateDataset = vi.mocked(useCreateDataset);
const mockedUseDatasetTagSuggestions = vi.mocked(useDatasetTagSuggestions);
const mockedUseEvalsPermissions = vi.mocked(useEvalsPermissions);
const mockedUseAccessibleSpaces = vi.mocked(useAccessibleSpaces);

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
      mutateAsync: vi.fn(),
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
      refetch: vi.fn(),
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
