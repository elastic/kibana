/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { ContextLandingPage } from './context_landing_page';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  name: 'My AI index',
  dest: { type: 'data_stream', value: '.ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = (core: CoreStart) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter>
              <ContextLandingPage />
            </MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

describe('ContextLandingPage', () => {
  const createCore = () => {
    const core = coreMock.createStart();
    core.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );
    return core;
  };

  it('renders the header and create button', async () => {
    const core = createCore();
    core.http.get.mockResolvedValue({ ai_indices: [] });

    renderWithProviders(core);

    expect(screen.getByTestId('contextLandingPage')).toBeInTheDocument();

    const createButton = screen.getByTestId('contextCreateAiIndexButton');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveTextContent('Create AI Index');

    await waitFor(() => expect(core.http.get).toHaveBeenCalled());
  });

  it('renders skeleton cards while the list API is loading', () => {
    const core = createCore();
    core.http.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(core);

    expect(screen.getAllByTestId('contextAiIndexCardSkeleton')).toHaveLength(3);
    expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();
  });

  it('renders a card per AI index returned by the list API and links to its detail page', async () => {
    const core = createCore();
    core.http.get.mockResolvedValue({
      ai_indices: [
        buildAiIndex({
          id: 'first',
          name: 'First index',
          sources: [
            { type: 'esql', value: 'FROM a' },
            { type: 'esql', value: 'FROM b' },
          ],
          automations: [{ type: 'workflow', value: 'nightly' }],
        }),
        buildAiIndex({ id: 'second', name: 'Second index' }),
      ],
    });

    renderWithProviders(core);

    const cards = await screen.findAllByTestId('contextAiIndexCard');
    expect(cards).toHaveLength(2);

    const firstLink = screen.getByRole('link', { name: /First index/ });
    expect(firstLink).toHaveAttribute('href', '/app/context_engine/indexes/first');

    const [firstSources, secondSources] = screen.getAllByTestId('contextAiIndexCardSources');
    expect(firstSources).toHaveTextContent('2 sources');
    expect(secondSources).toHaveTextContent('0 sources');

    const [firstAutomations, secondAutomations] = screen.getAllByTestId(
      'contextAiIndexCardAutomations'
    );
    expect(firstAutomations).toHaveTextContent('1 automation');
    expect(secondAutomations).toHaveTextContent('0 automations');

    expect(screen.getAllByTestId('contextAiIndexCardUpdated')[0]).toHaveTextContent(/^Updated /);
  });

  it('renders an empty prompt when there are no AI indexes', async () => {
    const core = createCore();
    core.http.get.mockResolvedValue({ ai_indices: [] });

    renderWithProviders(core);

    expect(await screen.findByTestId('contextAiIndexCardsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();
  });

  it('renders an error prompt when the list API fails', async () => {
    const core = createCore();
    core.http.get.mockRejectedValue(new Error('Boom'));

    renderWithProviders(core);

    expect(await screen.findByTestId('contextAiIndexCardsError')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });
});
