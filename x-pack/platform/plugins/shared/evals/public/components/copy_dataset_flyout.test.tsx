/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { useCopyDataset } from '../hooks/use_evals_api';
import { CopyDatasetFlyout } from './copy_dataset_flyout';

jest.mock('../hooks/use_evals_api');

const mockUseCopyDataset = useCopyDataset as jest.MockedFunction<typeof useCopyDataset>;
const mutateAsync = jest.fn();
const onClose = jest.fn();
const onCopied = jest.fn();

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

const renderFlyout = () =>
  render(
    <CopyDatasetFlyout
      datasetId="dataset-1"
      datasetName="Golden set"
      datasetDescription="Original description"
      onClose={onClose}
      onCopied={onCopied}
    />,
    { wrapper: Wrapper }
  );

beforeEach(() => {
  jest.clearAllMocks();
  mutateAsync.mockResolvedValue({
    dataset_id: 'copied-dataset-id',
    name: 'Golden set (copy)',
    examples_count: 3,
  });
  mockUseCopyDataset.mockReturnValue({ mutateAsync, isLoading: false } as unknown as ReturnType<
    typeof useCopyDataset
  >);
});

describe('CopyDatasetFlyout', () => {
  it('renders as a flyout and closes from the footer', async () => {
    renderFlyout();

    expect(screen.getByTestId('copyDatasetFlyout')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prefills the name and description from the source dataset', () => {
    renderFlyout();

    expect(screen.getByTestId('copyDatasetNameInput')).toHaveValue('Golden set (copy)');
    expect(screen.getByTestId('copyDatasetDescriptionInput')).toHaveValue('Original description');
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
  });

  it('disables confirmation and shows an inline error when the trimmed name is empty', async () => {
    renderFlyout();
    const confirmButton = screen.getByRole('button', { name: 'Copy dataset' });
    const nameInput = screen.getByTestId('copyDatasetNameInput');

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '   ');

    expect(confirmButton).toBeDisabled();
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
  });

  it('trims the name and reports the new dataset ID on success', async () => {
    renderFlyout();
    const nameInput = screen.getByTestId('copyDatasetNameInput');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '  My copy  ');
    await userEvent.click(screen.getByRole('button', { name: 'Copy dataset' }));

    await waitFor(() => expect(onCopied).toHaveBeenCalledWith('copied-dataset-id'));
    expect(mutateAsync).toHaveBeenCalledWith({
      datasetId: 'dataset-1',
      body: { name: 'My copy', description: 'Original description' },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the server error message for a name conflict', async () => {
    mutateAsync.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        request: {},
        response: { status: 409 } as Response,
        body: {
          statusCode: 409,
          message: 'A dataset named "Golden set (copy)" already exists',
        },
      })
    );
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Copy dataset' }));

    expect(
      await screen.findByText('A dataset named "Golden set (copy)" already exists')
    ).toBeInTheDocument();
    expect(screen.getByText('Unable to copy dataset')).toBeInTheDocument();
    expect(onCopied).not.toHaveBeenCalled();
  });

  it('clears the copy error when the name or description changes', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      request: {},
      response: { status: 409 } as Response,
      body: {
        statusCode: 409,
        message: 'A dataset named "Golden set (copy)" already exists',
      },
    });
    mutateAsync.mockRejectedValue(conflictError);
    renderFlyout();

    const conflictMessage = 'A dataset named "Golden set (copy)" already exists';
    await userEvent.click(screen.getByRole('button', { name: 'Copy dataset' }));
    expect(await screen.findByText(conflictMessage)).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('copyDatasetNameInput'), ' 2');
    expect(screen.queryByText(conflictMessage)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Copy dataset' }));
    expect(await screen.findByText(conflictMessage)).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('copyDatasetDescriptionInput'), ' updated');
    expect(screen.queryByText(conflictMessage)).not.toBeInTheDocument();
  });
});
