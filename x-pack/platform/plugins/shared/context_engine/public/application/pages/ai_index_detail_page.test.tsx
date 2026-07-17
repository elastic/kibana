/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { getViews } from '@kbn/esql-utils';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_PATHS, getAiIndexDetailPath } from '../paths';
import { AiIndexDetailPage } from './ai_index_detail_page';

jest.mock('@kbn/esql-utils', () => ({
  getViews: jest.fn(),
}));

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

const getViewsMock = getViews as jest.MockedFunction<typeof getViews>;

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  name: 'My AI index',
  dest: { type: 'data_stream', value: '.ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM My view' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (services: ReturnType<typeof coreMock.createStart>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[getAiIndexDetailPath(aiIndex.id)]}>
              <Route path={CONTEXT_ENGINE_PATHS.detail} component={AiIndexDetailPage} />
            </MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('AiIndexDetailPage', () => {
  beforeEach(() => {
    getViewsMock.mockResolvedValue({
      views: [{ name: 'My view', query: 'FROM my-index-* | LIMIT 100' }],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the AI index and renders its name and sources', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(services.http.get).toHaveBeenCalledWith(
      '/api/context_engine/ai_index/my-ai-index',
      expect.objectContaining({ version: expect.any(String) })
    );
    expect(screen.getByText('My AI index')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('FROM My view');
    // The non-editable detail list shows the generic ES|QL source type.
    expect(screen.getByTestId('contextAiIndexSourceType')).toHaveTextContent('ES|QL');
  });

  it('renders an empty state when there are no sources', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, sources: [] });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    const services = coreMock.createStart();
    services.http.get.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    expect(await screen.findByTestId('contextAiIndexDetailError')).toHaveTextContent('boom');
  });

  it('opens the edit sources modal with the current sources selected', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(await screen.findByTestId('contextEditSourcesModal')).toBeInTheDocument();
    // Stored sources are restored as raw ES|QL, keyed by their query.
    expect(await screen.findByTestId('contextSelectedSource-FROM My view')).toBeInTheDocument();
  });

  it('saves edited sources and refetches the AI index', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, sources: [] });
    services.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));
    expect(services.http.get).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    // The ES|QL Views tab is not selected by default, so open it first.
    fireEvent.click(await screen.findByTestId('contextSourcePickerTab-esqlViews'));

    const toggleButton = await screen.findByTestId('contextAddEsqlViewButton-My view');
    fireEvent.click(toggleButton);
    fireEvent.click(screen.getByTestId('contextEditSourcesDoneButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'My AI index',
            dest: { type: 'data_stream', value: '.ai-index-ds-my-ai-index' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM My view' }],
          }),
        })
      );
    });

    // Modal closes and the detail data is refetched after a successful save.
    await waitFor(() => {
      expect(screen.queryByTestId('contextEditSourcesModal')).not.toBeInTheDocument();
    });
    expect(services.http.get).toHaveBeenCalledTimes(2);
  });
});
