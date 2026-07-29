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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { ContextLandingPage } from './context_landing_page';
import { AI_INDICES_PER_PAGE } from './hooks/use_ai_index_list_state';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
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
          sources: [
            { type: 'esql', value: 'FROM a' },
            { type: 'esql', value: 'FROM b' },
          ],
          automations: [{ type: 'workflow', value: 'nightly' }],
        }),
        buildAiIndex({ id: 'second' }),
      ],
    });

    renderWithProviders(core);

    const cards = await screen.findAllByTestId('contextAiIndexCard');
    expect(cards).toHaveLength(2);

    const firstLink = screen.getByRole('link', { name: /first/ });
    expect(firstLink).toHaveAttribute('href', '/app/context_engine/ai_index/first');

    const [firstSources, secondSources] = screen.getAllByTestId('contextAiIndexCardSources');
    expect(firstSources).toHaveTextContent('2 sources');
    expect(secondSources).toHaveTextContent('0 sources');

    const [firstAutomations, secondAutomations] = screen.getAllByTestId(
      'contextAiIndexCardAutomations'
    );
    expect(firstAutomations).toHaveTextContent('1 automation');
    expect(secondAutomations).toHaveTextContent('0 automations');

    expect(screen.getAllByTestId('contextAiIndexCardUpdated')[0]).toHaveTextContent('Updated');
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

  it('marks managed AI indexes as owned by Elastic instead of showing a modified date', async () => {
    const core = createCore();
    core.http.get.mockResolvedValue({
      ai_indices: [buildAiIndex({ id: 'elastic', managed: true })],
    });

    renderWithProviders(core);

    expect(await screen.findByTestId('contextAiIndexCardManaged')).toHaveTextContent('Managed');
    expect(screen.queryByTestId('contextAiIndexCardUpdated')).not.toBeInTheDocument();
  });

  it('hides the search and filters until at least one AI index exists', async () => {
    const core = createCore();
    core.http.get.mockResolvedValue({ ai_indices: [] });

    renderWithProviders(core);

    await screen.findByTestId('contextAiIndexCardsEmpty');
    expect(screen.queryByTestId('contextAiIndexListSearch')).not.toBeInTheDocument();
  });

  describe('search and filters', () => {
    const renderWithAiIndexes = async () => {
      const core = createCore();
      core.http.get.mockResolvedValue({
        ai_indices: [
          buildAiIndex({ id: 'support-tickets', description: 'Escalation playbooks' }),
          buildAiIndex({ id: 'elastic', managed: true }),
          buildAiIndex({
            id: 'logs-index',
            dest: { type: 'index', value: 'logs-custom-index' },
          }),
        ],
      });

      renderWithProviders(core);
      await screen.findAllByTestId('contextAiIndexCard');
    };

    const cardTitles = () =>
      screen.getAllByTestId('contextAiIndexCard').map((card) => card.textContent);

    it('narrows the cards to the ones matching the search term', async () => {
      await renderWithAiIndexes();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'escalation' },
      });

      expect(cardTitles()).toHaveLength(1);
      expect(cardTitles()[0]).toContain('support-tickets');
      expect(screen.getByTestId('contextAiIndexListCount')).toHaveTextContent('1 AI Index');
    });

    it('narrows the cards to the selected owner', async () => {
      await renderWithAiIndexes();

      fireEvent.click(screen.getByTestId('contextAiIndexListOwnerFilter'));
      fireEvent.click(await screen.findByTestId('contextAiIndexListOwnerFilterOption-managed'));

      await waitFor(() => expect(cardTitles()).toHaveLength(1));
      expect(cardTitles()[0]).toContain('elastic');
    });

    it('narrows the cards to the selected type', async () => {
      await renderWithAiIndexes();

      fireEvent.click(screen.getByTestId('contextAiIndexListTypeFilter'));
      fireEvent.click(await screen.findByTestId('contextAiIndexListTypeFilterOption-data_stream'));

      await waitFor(() => expect(cardTitles()).toHaveLength(2));
      expect(cardTitles().some((title) => title?.includes('support-tickets'))).toBe(true);
      expect(cardTitles().some((title) => title?.includes('elastic'))).toBe(true);
      expect(cardTitles().every((title) => !title?.includes('logs-index'))).toBe(true);
    });

    it('narrows to the intersection when search and filters are combined', async () => {
      await renderWithAiIndexes();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'escalation' },
      });
      fireEvent.click(screen.getByTestId('contextAiIndexListOwnerFilter'));
      fireEvent.click(await screen.findByTestId('contextAiIndexListOwnerFilterOption-user'));

      await waitFor(() => expect(cardTitles()).toHaveLength(1));
      expect(cardTitles()[0]).toContain('support-tickets');
    });

    it('matches the search term against the destination value', async () => {
      await renderWithAiIndexes();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'logs-custom-index' },
      });

      await waitFor(() => expect(cardTitles()).toHaveLength(1));
      expect(cardTitles()[0]).toContain('logs-index');
    });

    it('offers a way back when nothing matches', async () => {
      await renderWithAiIndexes();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'nothing-matches-this' },
      });

      expect(screen.getByTestId('contextAiIndexCardsNoMatches')).toBeInTheDocument();
      expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('contextAiIndexListClearFilters'));

      expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(3);
    });
  });

  describe('pagination', () => {
    const renderPagedAiIndexes = async (count: number) => {
      const core = createCore();
      core.http.get.mockResolvedValue({
        ai_indices: Array.from({ length: count }, (_, index) =>
          buildAiIndex({ id: `ai-index-${index}` })
        ),
      });

      renderWithProviders(core);
      await screen.findAllByTestId('contextAiIndexCard');
    };

    it(`shows at most ${AI_INDICES_PER_PAGE} cards per page`, async () => {
      await renderPagedAiIndexes(AI_INDICES_PER_PAGE + 1);

      expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(AI_INDICES_PER_PAGE);
      expect(screen.getByTestId('contextAiIndexListCount')).toHaveTextContent(
        `${AI_INDICES_PER_PAGE + 1} AI Indexes`
      );

      fireEvent.click(screen.getByLabelText('Page 2 of 2'));

      expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(1);
    });

    it('hides the pagination when everything fits on one page', async () => {
      await renderPagedAiIndexes(AI_INDICES_PER_PAGE);

      expect(screen.queryByTestId('contextAiIndexListPagination')).not.toBeInTheDocument();
    });
  });
});
