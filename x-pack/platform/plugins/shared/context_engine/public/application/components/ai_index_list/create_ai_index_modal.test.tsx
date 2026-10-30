/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { createAppChromeMock } from '../../test_utils/app_chrome_mock';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../../common/features';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../../ai_index_created_location_state';
import { CreateAiIndexModal } from './create_ai_index_modal';

const renderWithProviders = (core: CoreStart, onClose: () => void = jest.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            ...core,
            history: scopedHistoryMock.create(),
            appChrome: createAppChromeMock(),
          }}
        >
          <QueryClientProvider client={queryClient}>
            <CreateAiIndexModal onClose={onClose} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const typeId = (id: string) => {
  fireEvent.change(screen.getByTestId('contextAiIndexNameInput'), { target: { value: id } });
};

const VALID_ID = 'support-ticket-triage';

describe('CreateAiIndexModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the confirm button disabled until a valid id is provided', () => {
    renderWithProviders(coreMock.createStart());

    expect(screen.getByTestId('contextCreateAiIndexModalConfirmButton')).toBeDisabled();

    typeId(VALID_ID);
    expect(screen.getByTestId('contextCreateAiIndexModalConfirmButton')).toBeEnabled();
  });

  it('shows an error and stays disabled when the id contains invalid characters', () => {
    renderWithProviders(coreMock.createStart());

    typeId('Support triage');

    expect(
      screen.getByText(
        'Must start with a lowercase letter or number, then use lowercase letters, numbers, hyphens, and underscores.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAiIndexModalConfirmButton')).toBeDisabled();
  });

  it('shows an error and stays disabled when the name is too long', () => {
    renderWithProviders(coreMock.createStart());

    typeId('a'.repeat(243));

    expect(screen.getByText('Name is too long. Try a shorter name.')).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAiIndexModalConfirmButton')).toBeDisabled();
  });

  it('creates an AI index without description or memory_enabled in the request body', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalConfirmButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({
          body: JSON.stringify({
            id: VALID_ID,
            dest: { type: 'index', value: 'ai-index-idx-support-ticket-triage' },
            automations: [],
            sources: [],
            traces: [],
          }),
        })
      );
    });
  });

  it('creates an index-backed AI index and navigates to its detail page', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalConfirmButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalled();
    });

    expect(services.application.navigateToApp).toHaveBeenCalledWith(CONTEXT_ENGINE_APP_ID, {
      path: '/ai_index/support-ticket-triage',
      state: AI_INDEX_CREATED_LOCATION_STATE,
    });
  });

  it('does not navigate when the create request fails', async () => {
    const services = coreMock.createStart();
    services.http.post.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalConfirmButton'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });

  it('surfaces a server conflict as an error toast', async () => {
    const services = coreMock.createStart();
    services.http.post.mockRejectedValue({
      body: { statusCode: 409, message: "AI index 'support-ticket-triage' already exists" },
    });

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalConfirmButton'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });

  it('does not call onClose while a create request is in progress', async () => {
    const services = coreMock.createStart();
    let resolvePost: (value: object) => void = () => {};
    services.http.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    const onClose = jest.fn();

    renderWithProviders(services, onClose);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalConfirmButton'));

    await waitFor(() => {
      expect(screen.getByTestId('contextCreateAiIndexModalCancelButton')).toBeDisabled();
    });

    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalCancelButton'));
    expect(onClose).not.toHaveBeenCalled();

    resolvePost({});
    await waitFor(() => {
      expect(services.application.navigateToApp).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    renderWithProviders(coreMock.createStart(), onClose);

    fireEvent.click(screen.getByTestId('contextCreateAiIndexModalCancelButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
