/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '@kbn/spaces-plugin/common/constants';
import { useAccessibleSpaces } from '../hooks/use_spaces';
import { useDeleteDataset, useEvaluationExperiments } from '../hooks/use_evals_api';
import { DeleteDatasetModal } from './delete_dataset_modal';

jest.mock('../hooks/use_spaces');
jest.mock('../hooks/use_evals_api');

const mockUseAccessibleSpaces = useAccessibleSpaces as jest.MockedFunction<
  typeof useAccessibleSpaces
>;
const mockUseDeleteDataset = useDeleteDataset as jest.MockedFunction<typeof useDeleteDataset>;
const mockUseEvaluationExperiments = useEvaluationExperiments as jest.MockedFunction<
  typeof useEvaluationExperiments
>;

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

const mutateAsync = jest.fn().mockResolvedValue({ deleted: true, unshared: false });

const renderModal = (spaceIds?: string[]) =>
  render(
    <DeleteDatasetModal
      datasetId="dataset-1"
      datasetName="Golden set"
      examplesCount={3}
      spaceIds={spaceIds}
      onClose={jest.fn()}
    />,
    { wrapper: Wrapper }
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccessibleSpaces.mockReturnValue({
    isEnabled: true,
    isLoading: false,
    activeSpaceId: 'default',
    spaces: [
      { id: 'default', name: 'Default' },
      { id: 'marketing', name: 'Marketing' },
    ],
  });
  mockUseDeleteDataset.mockReturnValue({ mutateAsync, isLoading: false } as unknown as ReturnType<
    typeof useDeleteDataset
  >);
  mockUseEvaluationExperiments.mockReturnValue({
    data: { total: 0 },
    isLoading: false,
  } as unknown as ReturnType<typeof useEvaluationExperiments>);
});

describe('DeleteDatasetModal', () => {
  it('treats a dataset that only lives here as an irreversible delete', async () => {
    renderModal(['default']);

    expect(screen.getByText('Delete dataset "Golden set"?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Delete dataset' });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByTestId('deleteDatasetConfirmInput'), 'Golden set');
    expect(confirmButton).toBeEnabled();
  });

  it('offers to leave a space rather than delete a dataset others still use', async () => {
    renderModal(['default', 'marketing']);

    expect(screen.getByText('Remove "Golden set" from this space?')).toBeInTheDocument();
    expect(screen.getByText(/stays in Marketing/)).toBeInTheDocument();
    // Nothing is lost, so the name does not have to be typed out.
    expect(screen.queryByTestId('deleteDatasetConfirmInput')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove from this space' }));

    expect(mutateAsync).toHaveBeenCalledWith({ datasetId: 'dataset-1' });
  });

  it('says a dataset stays in spaces it cannot name', () => {
    renderModal(['default', UNKNOWN_SPACE]);

    expect(screen.getByText(/stays in 1 space you do not have access to/)).toBeInTheDocument();
  });

  it('warns that deleting an all-spaces dataset removes it everywhere', () => {
    renderModal([ALL_SPACES_ID]);

    expect(screen.getByText('Delete dataset "Golden set"?')).toBeInTheDocument();
    expect(screen.getByText('This dataset is in every space')).toBeInTheDocument();
    expect(screen.getByTestId('deleteDatasetConfirmInput')).toBeInTheDocument();
  });
});
