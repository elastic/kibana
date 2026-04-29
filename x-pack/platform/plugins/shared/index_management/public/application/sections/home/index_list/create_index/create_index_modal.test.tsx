/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { CreateIndexModal } from './create_index_modal';
import { AppContextProvider } from '../../../../app_context';
import type { AppDependencies } from '../../../../app_context';
import { NotificationService } from '../../../../services/notification';

const mockCreateIndex = jest.fn();
jest.mock('../../../../services', () => ({
  createIndex: (...args: unknown[]) => mockCreateIndex(...args),
}));

let notificationService: NotificationService;
let showSuccessToastSpy: jest.SpyInstance;

jest.mock('./utils', () => ({
  generateRandomIndexName: () => 'search-abcd',
  isValidIndexName: (name: string) => {
    if (!name || name !== name.toLowerCase() || name.length === 0) return false;
    return true;
  },
}));

const renderModal = (props: Partial<React.ComponentProps<typeof CreateIndexModal>> = {}) => {
  const defaultProps = {
    closeModal: jest.fn(),
    loadIndices: jest.fn(),
  };

  const ctx = {
    services: {
      notificationService,
    },
  } as unknown as AppDependencies;

  return render(
    <I18nProvider>
      <EuiThemeProvider>
        <AppContextProvider value={ctx}>
          <CreateIndexModal {...defaultProps} {...props} />
        </AppContextProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};

describe('CreateIndexModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const toasts = { add: jest.fn() } as any;
    notificationService = new NotificationService(toasts);
    showSuccessToastSpy = jest.spyOn(notificationService, 'showSuccessToast');
  });

  it('renders the modal with title and description', () => {
    renderModal();
    expect(screen.getByText('Create your index')).toBeInTheDocument();
    expect(
      screen.getByText('An index stores and defines the schema of your data.')
    ).toBeInTheDocument();
  });

  it('pre-fills the index name with a generated random name', () => {
    renderModal();
    const input = screen.getByTestId('createIndexNameFieldText');
    expect(input).toHaveValue('search-abcd');
  });

  it('shows index name and index mode form fields', () => {
    renderModal();
    expect(screen.getByTestId('createIndexNameFieldText')).toBeInTheDocument();
    expect(screen.getByTestId('indexModeField')).toBeInTheDocument();
  });

  it('shows a validation error for invalid index names', async () => {
    renderModal();
    const input = screen.getByTestId('createIndexNameFieldText');
    await userEvent.clear(input);
    await userEvent.type(input, 'INVALID');

    expect(screen.getByText('Index name is not valid')).toBeInTheDocument();
  });

  it('clears validation error when a valid name is entered', async () => {
    renderModal();
    const input = screen.getByTestId('createIndexNameFieldText');

    await userEvent.clear(input);
    await userEvent.type(input, 'INVALID');
    expect(screen.getByText('Index name is not valid')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'valid-name');
    expect(screen.queryByText('Index name is not valid')).not.toBeInTheDocument();
  });

  it('calls closeModal when cancel button is clicked', () => {
    const closeModal = jest.fn();
    renderModal({ closeModal });
    fireEvent.click(screen.getByTestId('createIndexCancelButton'));
    expect(closeModal).toHaveBeenCalled();
  });

  it('toggles the API code block when Show/Hide API button is clicked', () => {
    renderModal();
    expect(screen.getByText('Show API')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('createIndexShowApiButton'));
    expect(screen.getByText('Hide API')).toBeInTheDocument();
    expect(screen.getByText(/PUT search-abcd/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('createIndexShowApiButton'));
    expect(screen.getByText('Show API')).toBeInTheDocument();
  });

  it('reflects the selected index mode in the API code block', async () => {
    renderModal();
    fireEvent.click(screen.getByTestId('createIndexShowApiButton'));

    expect(screen.getByText(/\"mode\":\"standard\"/)).toBeInTheDocument();
  });

  it('creates the index on submit with valid name', async () => {
    const closeModal = jest.fn();
    const loadIndices = jest.fn();
    mockCreateIndex.mockResolvedValue({ error: undefined });

    renderModal({ closeModal, loadIndices });
    fireEvent.click(screen.getByTestId('createIndexSaveButton'));

    await waitFor(() => {
      expect(mockCreateIndex).toHaveBeenCalledWith('search-abcd', 'standard');
    });

    await waitFor(() => {
      expect(showSuccessToastSpy).toHaveBeenCalled();
      expect(closeModal).toHaveBeenCalled();
      expect(loadIndices).toHaveBeenCalled();
    });
  });

  it('creates the index when pressing Enter in the index name input', async () => {
    const closeModal = jest.fn();
    const loadIndices = jest.fn();
    mockCreateIndex.mockResolvedValue({ error: undefined });

    renderModal({ closeModal, loadIndices });
    fireEvent.submit(screen.getByTestId('createIndexModalForm'));

    await waitFor(() => {
      expect(mockCreateIndex).toHaveBeenCalledWith('search-abcd', 'standard');
    });

    await waitFor(() => {
      expect(showSuccessToastSpy).toHaveBeenCalled();
      expect(closeModal).toHaveBeenCalled();
      expect(loadIndices).toHaveBeenCalled();
    });
  });

  it('displays an error callout when index creation fails', async () => {
    mockCreateIndex.mockResolvedValue({ error: { message: 'Index already exists' } });

    renderModal();
    fireEvent.click(screen.getByTestId('createIndexSaveButton'));

    await waitFor(() => {
      expect(screen.getByText('Error creating index')).toBeInTheDocument();
      expect(screen.getByText(/Index already exists/)).toBeInTheDocument();
    });
  });

  it('does not submit when the index name is invalid', async () => {
    renderModal();
    const input = screen.getByTestId('createIndexNameFieldText');

    await userEvent.clear(input);

    fireEvent.click(screen.getByTestId('createIndexSaveButton'));

    expect(mockCreateIndex).not.toHaveBeenCalled();
  });
});
