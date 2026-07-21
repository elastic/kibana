/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KnowledgeIndicatorsPanel } from './knowledge_indicators_panel';
import { createMockWiredStreamDefinition } from '../stream_management/data_management/shared/mocks';

const mockUseStreamFeatures = jest.fn();
const mockUseFetchDiscoveryQueries = jest.fn();
const mockUseStreamsAppRouter = jest.fn();

jest.mock('../../hooks/significant_events/use_stream_features', () => ({
  useStreamFeatures: (...args: unknown[]) => mockUseStreamFeatures(...args),
}));

jest.mock('../../hooks/significant_events/use_fetch_discovery_queries', () => ({
  useFetchDiscoveryQueries: (...args: unknown[]) => mockUseFetchDiscoveryQueries(...args),
}));

jest.mock('../../hooks/significant_events/use_stream_onboarding_status', () => ({
  useStreamOnboardingStatus: () => undefined,
}));

jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => mockUseStreamsAppRouter(),
}));

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('KnowledgeIndicatorsPanel', () => {
  const definition = createMockWiredStreamDefinition();
  const link = jest.fn(() => '/app/streams/_discovery/knowledge_indicators?stream=logs');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppRouter.mockReturnValue({ link });
    mockUseStreamFeatures.mockReturnValue({
      features: [{ id: 'feature-1' }, { id: 'feature-2' }],
      featuresLoading: false,
      error: undefined,
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: { total: 8, queries: [{ id: 0 }] },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
  });

  it('renders feature and query counts with features first', () => {
    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(screen.getByText('Knowledge indicators')).toBeInTheDocument();
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsFeaturesCount')).toHaveTextContent('2');
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsFeaturesCount')).toHaveTextContent(
      'features'
    );
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsQueriesCount')).toHaveTextContent('8');
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsQueriesCount')).toHaveTextContent(
      'queries'
    );
  });

  it('uses singular labels when the count is one', () => {
    mockUseStreamFeatures.mockReturnValue({
      features: [{ id: 'feature-1' }],
      featuresLoading: false,
      error: undefined,
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: { total: 1, queries: [{ id: 0 }] },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsFeaturesCount')).toHaveTextContent(
      'feature'
    );
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsQueriesCount')).toHaveTextContent(
      'query'
    );
  });

  it('links to the discovery knowledge indicators page with the stream pre-filtered', () => {
    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(link).toHaveBeenCalledWith('/_discovery/{tab}', {
      path: { tab: 'knowledge_indicators' },
      query: { stream: definition.stream.name },
    });
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsPanelLink')).toHaveAttribute(
      'href',
      '/app/streams/_discovery/knowledge_indicators?stream=logs'
    );
  });

  it('shows loading state while counts are loading', () => {
    mockUseStreamFeatures.mockReturnValue({
      features: [],
      featuresLoading: true,
      error: undefined,
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      isError: false,
    });

    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(screen.getAllByTestId('knowledgeIndicatorsCountLoading')).toHaveLength(2);
    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsPanelLink')).toHaveAttribute(
      'aria-label',
      `View knowledge indicators for ${definition.stream.name}: loading counts`
    );
  });

  it('shows unavailable state when a count fetch fails', () => {
    mockUseStreamFeatures.mockReturnValue({
      features: [],
      featuresLoading: false,
      error: new Error('features failed'),
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    });

    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(screen.getAllByTestId('knowledgeIndicatorsCountUnavailable')).toHaveLength(2);
  });

  it('shows unavailable state when query count data is missing without an error', () => {
    mockUseStreamFeatures.mockReturnValue({
      features: [{ id: 'feature-1' }],
      featuresLoading: false,
      error: undefined,
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(
      screen
        .getByTestId('streamsAppKnowledgeIndicatorsQueriesCount')
        .querySelector('[data-test-subj="knowledgeIndicatorsCountUnavailable"]')
    ).toBeInTheDocument();
  });

  it('shows loading spinner for queries while refetching after time range changes', () => {
    mockUseStreamFeatures.mockReturnValue({
      features: [{ id: 'feature-1' }],
      featuresLoading: false,
      error: undefined,
    });
    mockUseFetchDiscoveryQueries.mockReturnValue({
      data: { total: 3, queries: [{ id: 0 }] },
      isLoading: false,
      isFetching: true,
      isError: false,
    });

    renderWithI18n(<KnowledgeIndicatorsPanel definition={definition} />);

    expect(screen.getByTestId('streamsAppKnowledgeIndicatorsFeaturesCount')).toHaveTextContent('1');
    expect(
      screen
        .getByTestId('streamsAppKnowledgeIndicatorsQueriesCount')
        .querySelector('[data-test-subj="knowledgeIndicatorsCountLoading"]')
    ).toBeInTheDocument();
  });
});
