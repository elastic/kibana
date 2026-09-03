/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { createAppChromeMock } from '../test_utils/app_chrome_mock';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { CONTEXT_ENGINE_PATHS } from '../paths';
import { CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ } from '../layout/context_engine_page_header';
import { CreateAiIndexPage } from './create_ai_index_page';

const renderWithProviders = (services: ReturnType<typeof coreMock.createStart>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ChromeServiceProvider value={{ chrome: services.chrome }}>
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider
            services={{
              ...services,
              history: scopedHistoryMock.create(),
              appChrome: createAppChromeMock(),
            }}
          >
            <QueryClientProvider client={queryClient}>
              <CreateAiIndexPage />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    </ChromeServiceProvider>
  );
};

const typeId = (id: string) => {
  fireEvent.change(screen.getByTestId('contextAiIndexNameInput'), { target: { value: id } });
};

const typeDescription = (description: string) => {
  fireEvent.change(screen.getByTestId('contextAiIndexDescriptionInput'), {
    target: { value: description },
  });
};

const VALID_ID = 'support-ticket-triage';

describe('CreateAiIndexPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a back button linking to the AI indexes landing page', () => {
    const services = coreMock.createStart();
    services.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );

    renderWithProviders(services);

    expect(services.application.getUrlForApp).toHaveBeenCalledWith(
      CONTEXT_ENGINE_APP_ID,
      expect.objectContaining({ path: CONTEXT_ENGINE_PATHS.landing })
    );
    expect(screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ)).toHaveAttribute(
      'href',
      '/app/context_engine/'
    );
  });

  it('navigates to the landing page and prevents the anchor default navigation on back click', () => {
    const services = coreMock.createStart();
    services.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );

    renderWithProviders(services);

    const backButton = screen.getByTestId(CONTEXT_ENGINE_BACK_BUTTON_TEST_SUBJ);
    fireEvent.click(backButton);

    expect(services.application.navigateToApp).toHaveBeenCalledWith(
      CONTEXT_ENGINE_APP_ID,
      expect.objectContaining({ path: CONTEXT_ENGINE_PATHS.landing })
    );
  });

  it('keeps the create button disabled until a valid id is provided, without requiring a source', () => {
    renderWithProviders(coreMock.createStart());

    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeDisabled();

    typeId(VALID_ID);
    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeEnabled();
  });

  it('creates an AI index without any source', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({
          body: JSON.stringify({
            id: VALID_ID,
            dest: { type: 'index', value: 'ai-index-idx-support-ticket-triage' },
            automations: [],
            sources: [],
          }),
        })
      );
    });
  });

  it('includes the description in the create request when provided', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    typeDescription('Context for triaging support tickets');
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({
          body: JSON.stringify({
            id: VALID_ID,
            description: 'Context for triaging support tickets',
            dest: { type: 'index', value: 'ai-index-idx-support-ticket-triage' },
            automations: [],
            sources: [],
          }),
        })
      );
    });
  });

  it('navigates to the detail page, where sources and automations are set up', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.application.navigateToApp).toHaveBeenCalledWith(CONTEXT_ENGINE_APP_ID, {
        path: '/ai_index/support-ticket-triage',
      });
    });
  });

  it('asks for nothing beyond a name and a description', () => {
    // Sources and storage type used to be part of creation. They are set up afterwards, on the
    // detail page, where the assistant can work them out from what the user wants to answer.
    renderWithProviders(coreMock.createStart());

    expect(screen.getByTestId('contextAiIndexNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexDescriptionInput')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddEsqlSourceButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexStorageType-index')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexStorageType-data_stream')).not.toBeInTheDocument();
  });

  it('does not navigate when the create request fails', async () => {
    const services = coreMock.createStart();
    services.http.post.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });

  it('shows an error and stays disabled when the id contains invalid characters', () => {
    renderWithProviders(coreMock.createStart());

    typeId('Support triage');

    expect(
      screen.getByText(
        'Must start with a lowercase letter or number, then use lowercase letters, numbers, hyphens, and underscores.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeDisabled();
  });

  it('posts to the create endpoint so a duplicate id is rejected by the server', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({ body: expect.stringContaining(`"id":"${VALID_ID}"`) })
      );
    });
  });

  it('surfaces a server conflict as an error toast', async () => {
    const services = coreMock.createStart();
    services.http.post.mockRejectedValue({
      body: { statusCode: 409, message: "AI index 'support-ticket-triage' already exists" },
    });

    renderWithProviders(services);

    typeId(VALID_ID);
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });
});
