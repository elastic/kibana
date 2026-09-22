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
import { MemoryRouter } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { AI_INDICES_PER_PAGE } from '../../hooks/use_ai_index_list_state';
import { AiIndexList } from './ai_index_list';

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

type AiIndexListProps = React.ComponentProps<typeof AiIndexList>;

const renderWithProviders = (
  props: AiIndexListProps,
  core: ReturnType<typeof coreMock.createStart> = coreMock.createStart()
) => {
  core.application.getUrlForApp.mockImplementation(
    (appId, options) => `/app/${appId}${options?.path ?? ''}`
  );

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <MemoryRouter>
            <AiIndexList {...props} />
          </MemoryRouter>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('AiIndexList', () => {
  it('renders skeleton cards and no index cards while the list request is pending', () => {
    renderWithProviders({ aiIndices: [], isLoading: true, error: undefined });

    expect(screen.getAllByTestId('contextAiIndexCardSkeleton')).toHaveLength(3);
    expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();
  });

  it('renders an error prompt with the error message when the request rejects', () => {
    renderWithProviders({ aiIndices: [], isLoading: false, error: new Error('Boom') });

    expect(screen.getByTestId('contextAiIndexCardsError')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('renders an empty prompt when the API returns an empty array', () => {
    renderWithProviders({ aiIndices: [], isLoading: false, error: undefined });

    expect(screen.getByTestId('contextAiIndexCardsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextCreateAiIndexButton')).toBeInTheDocument();
  });

  it('does not render search and filter controls while loading, on error, or when empty', () => {
    const { unmount: unmountLoading } = renderWithProviders({
      aiIndices: [],
      isLoading: true,
      error: undefined,
    });
    expect(screen.queryByTestId('contextAiIndexListSearch')).not.toBeInTheDocument();
    unmountLoading();

    const { unmount: unmountError } = renderWithProviders({
      aiIndices: [],
      isLoading: false,
      error: new Error('Boom'),
    });
    expect(screen.queryByTestId('contextAiIndexListSearch')).not.toBeInTheDocument();
    unmountError();

    renderWithProviders({ aiIndices: [], isLoading: false, error: undefined });
    expect(screen.queryByTestId('contextAiIndexListSearch')).not.toBeInTheDocument();
  });

  it('renders one card per returned index and a match count summary when there is data', () => {
    renderWithProviders({
      aiIndices: [
        buildAiIndex({ id: 'first' }),
        buildAiIndex({ id: 'second' }),
        buildAiIndex({ id: 'third' }),
      ],
      isLoading: false,
      error: undefined,
    });

    expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(3);
    expect(screen.getByTestId('contextAiIndexListCount')).toHaveTextContent('3 AI Indexes');
    expect(screen.getByRole('link', { name: /first/ })).toHaveAttribute(
      'href',
      '/app/context_engine/ai_index/first'
    );
  });

  it('renders a no-matches prompt and restores all cards when filters are cleared', () => {
    renderWithProviders({
      aiIndices: [buildAiIndex({ id: 'alpha' }), buildAiIndex({ id: 'beta' })],
      isLoading: false,
      error: undefined,
    });

    fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
      target: { value: 'nothing-matches-this' },
    });

    expect(screen.getByTestId('contextAiIndexCardsNoMatches')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexCard')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextAiIndexListClearFilters'));

    expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(2);
  });

  it('hides pagination when everything fits on one page', () => {
    renderWithProviders({
      aiIndices: Array.from({ length: AI_INDICES_PER_PAGE }, (_, index) =>
        buildAiIndex({ id: `ai-index-${index}` })
      ),
      isLoading: false,
      error: undefined,
    });

    expect(screen.queryByTestId('contextAiIndexListPagination')).not.toBeInTheDocument();
  });

  it(`renders pagination when there are more than ${AI_INDICES_PER_PAGE} indexes`, async () => {
    renderWithProviders({
      aiIndices: Array.from({ length: AI_INDICES_PER_PAGE + 1 }, (_, index) =>
        buildAiIndex({ id: `ai-index-${index}` })
      ),
      isLoading: false,
      error: undefined,
    });

    expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(AI_INDICES_PER_PAGE);
    expect(screen.getByTestId('contextAiIndexListPagination')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexListCount')).toHaveTextContent(
      `${AI_INDICES_PER_PAGE + 1} AI Indexes`
    );

    fireEvent.click(screen.getByLabelText(`Page 2 of 2`));

    await waitFor(() => expect(screen.getAllByTestId('contextAiIndexCard')).toHaveLength(1));
  });

  describe('search', () => {
    const renderWithSearchFixtures = () => {
      renderWithProviders({
        aiIndices: [
          buildAiIndex({
            id: 'by-id-index',
            description: 'Unrelated description',
            dest: { type: 'index', value: 'unrelated-backing-store' },
          }),
          buildAiIndex({
            id: 'by-description-index',
            description: 'Unique playbook text',
            dest: { type: 'data_stream', value: 'unrelated-data-stream' },
          }),
          buildAiIndex({
            id: 'by-dest-index',
            description: 'Another description',
            dest: { type: 'data_stream', value: 'special-backing-value' },
          }),
          buildAiIndex({
            id: 'no-description-index',
            dest: { type: 'index', value: 'index-without-description' },
          }),
        ],
        isLoading: false,
        error: undefined,
      });
    };

    const cardIds = () =>
      screen.getAllByTestId('contextAiIndexCard').map((card) => card.textContent);

    it('matches on the index id', () => {
      renderWithSearchFixtures();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'by-id-index' },
      });

      expect(cardIds()).toHaveLength(1);
      expect(cardIds()[0]).toContain('by-id-index');
    });

    it('matches on the description', () => {
      renderWithSearchFixtures();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'unique playbook' },
      });

      expect(cardIds()).toHaveLength(1);
      expect(cardIds()[0]).toContain('by-description-index');
    });

    it('matches on dest.value', () => {
      renderWithSearchFixtures();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'special-backing-value' },
      });

      expect(cardIds()).toHaveLength(1);
      expect(cardIds()[0]).toContain('by-dest-index');
    });

    it('does not crash when searching indexes without a description and excludes them from text matches', () => {
      renderWithSearchFixtures();

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'playbook' },
      });

      expect(cardIds()).toHaveLength(1);
      expect(cardIds()[0]).toContain('by-description-index');
      expect(cardIds()[0]).not.toContain('no-description-index');

      fireEvent.change(screen.getByTestId('contextAiIndexListSearch'), {
        target: { value: 'no-description-index' },
      });

      expect(cardIds()).toHaveLength(1);
      expect(cardIds()[0]).toContain('no-description-index');
    });
  });
});
