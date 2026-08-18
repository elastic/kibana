/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { CreateAiIndexPage } from './create_ai_index_page';

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
  }) => (
    <textarea
      data-test-subj="mockEsqlEditor"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

jest.mock('../hooks/use_data_connectors', () => ({
  useDataConnectors: () => ({
    connectors: [],
    connectorNameById: new Map(),
    connectorActionTypeById: new Map(),
    isLoading: false,
  }),
}));

const renderWithProviders = (services: ReturnType<typeof coreMock.createStart>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <CreateAiIndexPage />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const addEsqlSource = (query: string) => {
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
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

  it('creates an index-backed AI index and navigates to its detail page', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({
          body: JSON.stringify({
            id: VALID_ID,
            dest: { type: 'index', value: 'ai-index-idx-support-ticket-triage' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }],
          }),
        })
      );
    });

    expect(services.application.navigateToApp).toHaveBeenCalledWith(CONTEXT_ENGINE_APP_ID, {
      path: '/ai_index/support-ticket-triage',
    });
  });

  it('creates a data-stream-backed AI index when that storage type is selected', async () => {
    const services = coreMock.createStart();
    services.http.post.mockResolvedValue({});

    renderWithProviders(services);

    typeId(VALID_ID);
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(screen.getByTestId('contextAiIndexStorageType-data_stream'));
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith(
        '/api/context_engine/ai_index',
        expect.objectContaining({
          body: JSON.stringify({
            id: VALID_ID,
            dest: { type: 'data_stream', value: 'ai-index-ds-support-ticket-triage' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }],
          }),
        })
      );
    });
  });

  it('does not navigate when the create request fails', async () => {
    const services = coreMock.createStart();
    services.http.post.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    typeId(VALID_ID);
    addEsqlSource('FROM logs-* | LIMIT 10');
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
