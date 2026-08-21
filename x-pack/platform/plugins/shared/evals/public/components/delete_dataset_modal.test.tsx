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
import { UNKNOWN_SPACE } from '@kbn/spaces-plugin/common';
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

const renderModal = (spaceIds?: string[], examplesCount = 3) =>
  render(
    <DeleteDatasetModal
      datasetId="dataset-1"
      datasetName="Golden set"
      examplesCount={examplesCount}
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

  it.each([
    ['spaces are unavailable', { isEnabled: false, isLoading: false }],
    ['the active space is still loading', { isEnabled: true, isLoading: true }],
  ])('still treats it as an irreversible delete when %s', (_, spacesState) => {
    // Neither state knows the active space. Reading that as "shared" would drop
    // the confirmation gate and promise the examples survive somewhere else,
    // while the server deletes the dataset outright.
    mockUseAccessibleSpaces.mockReturnValue({
      ...spacesState,
      activeSpaceId: undefined,
      spaces: [],
    });

    renderModal(['default']);

    expect(screen.getByText('Delete dataset "Golden set"?')).toBeInTheDocument();
    expect(screen.getByTestId('deleteDatasetConfirmInput')).toBeInTheDocument();
  });

  it('offers to leave a space rather than delete a dataset others still use', async () => {
    renderModal(['default', 'marketing']);

    expect(screen.getByText('Remove "Golden set" from this space?')).toBeInTheDocument();
    expect(
      screen.getByText(/available in the 1 other space it is shared with/)
    ).toBeInTheDocument();
    // Nothing is lost, so the name does not have to be typed out.
    expect(screen.queryByTestId('deleteDatasetConfirmInput')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove from this space' }));

    expect(mutateAsync).toHaveBeenCalledWith({ datasetId: 'dataset-1', intent: 'unshare' });
  });

  it('asks again as a delete when the other spaces have since let go', async () => {
    // The assignment the dialog was opened with is a snapshot. Going ahead on
    // it would destroy the dataset behind a dialog promising its examples stay.
    mutateAsync.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        request: {},
        response: { status: 409 } as Response,
      })
    );

    renderModal(['default', 'marketing']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove from this space' }));

    expect(screen.getByText('Delete dataset "Golden set"?')).toBeInTheDocument();
    expect(screen.getByText(/only one holding it/)).toBeInTheDocument();
    expect(screen.getByTestId('deleteDatasetConfirmInput')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('deleteDatasetConfirmInput'), 'Golden set');
    await userEvent.click(screen.getByRole('button', { name: 'Delete dataset' }));

    expect(mutateAsync).toHaveBeenLastCalledWith({ datasetId: 'dataset-1', intent: 'delete' });
  });

  it('asks again as an unshare without counting spaces it can no longer vouch for', async () => {
    mutateAsync.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        request: {},
        response: { status: 409 } as Response,
      })
    );

    renderModal(['default']);
    await userEvent.type(screen.getByTestId('deleteDatasetConfirmInput'), 'Golden set');
    await userEvent.click(screen.getByRole('button', { name: 'Delete dataset' }));

    expect(screen.getByText('Remove "Golden set" from this space?')).toBeInTheDocument();
    // The spaces this was opened with are the ones the server just called
    // stale, so saying it stays in "0 other spaces" would contradict itself.
    expect(screen.getByText(/spaces it has since been shared with/)).toBeInTheDocument();
    expect(screen.queryByText(/0 other spaces/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove from this space' }));

    expect(mutateAsync).toHaveBeenLastCalledWith({ datasetId: 'dataset-1', intent: 'unshare' });
  });

  it('reports why the server refused, not the status text', async () => {
    mutateAsync.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), {
        request: {},
        response: { status: 403 } as Response,
        body: {
          statusCode: 403,
          message: 'Insufficient privileges in 1 space you do not have access to',
        },
      })
    );

    renderModal(['default', 'marketing']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove from this space' }));

    expect(
      screen.getByText('Insufficient privileges in 1 space you do not have access to')
    ).toBeInTheDocument();
  });

  it.each([
    [1, 'Its 1 example stays available'],
    [3, 'Its 3 examples stay available'],
  ])('agrees the verb with the example count (%i)', (examplesCount, sentence) => {
    renderModal(['default', 'marketing'], examplesCount);

    expect(screen.getByText(new RegExp(sentence))).toBeInTheDocument();
  });

  it('counts a space it cannot name among the ones the dataset stays in', () => {
    renderModal(['default', UNKNOWN_SPACE]);

    expect(
      screen.getByText(/available in the 1 other space it is shared with/)
    ).toBeInTheDocument();
  });
});
