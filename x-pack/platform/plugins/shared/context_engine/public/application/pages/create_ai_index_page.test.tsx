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

const typeName = (name: string) => {
  fireEvent.change(screen.getByTestId('contextAiIndexNameInput'), { target: { value: name } });
};

describe('CreateAiIndexPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the create button disabled until a name is provided, without requiring a source', () => {
    renderWithProviders(coreMock.createStart());

    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeDisabled();

    typeName('Support triage');
    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeEnabled();
  });

  it('creates an AI index without any source', async () => {
    const services = coreMock.createStart();
    services.http.put.mockResolvedValue({ status: 'created' });

    renderWithProviders(services);

    typeName('Support triage');
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/support-triage',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Support triage',
            dest: { type: 'index', value: 'ai-index-idx-support-triage' },
            automations: [],
            sources: [],
          }),
        })
      );
    });
  });

  it('creates an index-backed AI index and navigates to its detail page', async () => {
    const services = coreMock.createStart();
    services.http.put.mockResolvedValue({ status: 'created' });

    renderWithProviders(services);

    typeName('Support triage');
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/support-triage',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Support triage',
            dest: { type: 'index', value: 'ai-index-idx-support-triage' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }],
          }),
        })
      );
    });

    expect(services.application.navigateToApp).toHaveBeenCalledWith(CONTEXT_ENGINE_APP_ID, {
      path: '/indexes/support-triage',
    });
  });

  it('creates a data-stream-backed AI index when that storage type is selected', async () => {
    const services = coreMock.createStart();
    services.http.put.mockResolvedValue({ status: 'created' });

    renderWithProviders(services);

    typeName('Support triage');
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(screen.getByTestId('contextAiIndexStorageType-data_stream'));
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/support-triage',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Support triage',
            dest: { type: 'data_stream', value: 'ai-index-ds-support-triage' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }],
          }),
        })
      );
    });
  });

  it('does not navigate when the create request fails', async () => {
    const services = coreMock.createStart();
    services.http.put.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    typeName('Support triage');
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(screen.getByTestId('contextCreateAiIndexButton'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });
});
