/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { OverviewStatCards } from './overview_stat_cards';

jest.mock('../../hooks/use_navigation');

const { useNavigation: mockUseNavigation } = jest.requireMock('../../hooks/use_navigation');
const mockNavigateToContextEngine = jest.fn();

type OverviewStatCardsProps = React.ComponentProps<typeof OverviewStatCards>;

const defaultProps: OverviewStatCardsProps = {
  aiIndexId: 'my-index',
  knowledgeDocumentsCount: 12,
  sourcesCount: 2,
  automationsCount: 3,
  isManaged: false,
  isMemoryEnabled: false,
  isLoading: false,
};

const renderCards = (props: Partial<OverviewStatCardsProps> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <OverviewStatCards {...defaultProps} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('OverviewStatCards', () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue({
      createContextEngineUrl: (path: string) => `/app/context_engine${path}`,
      navigateToContextEngine: mockNavigateToContextEngine,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the counts with their captions', () => {
    renderCards();

    expect(screen.getByTestId('contextOverviewStatCardValue-knowledgeDocuments')).toHaveTextContent(
      '12'
    );
    expect(
      screen.getByTestId('contextOverviewStatCardCaption-knowledgeDocuments')
    ).toHaveTextContent(/^from your sources$/);
    expect(screen.getByTestId('contextOverviewStatCardValue-sources')).toHaveTextContent('2');
    expect(screen.getByTestId('contextOverviewStatCardCaption-sources')).toHaveTextContent(
      'read by your automations'
    );
    expect(screen.getByTestId('contextOverviewStatCardValue-automations')).toHaveTextContent('3');
    expect(screen.getByTestId('contextOverviewStatCardCaption-automations')).toHaveTextContent(
      'keep documents up to date'
    );
  });

  it('mentions memories in the knowledge documents caption while memory is on', () => {
    renderCards({ isMemoryEnabled: true });

    expect(
      screen.getByTestId('contextOverviewStatCardCaption-knowledgeDocuments')
    ).toHaveTextContent('from your sources and memories');
  });

  it('shows no sources count for a managed AI index', () => {
    renderCards({ isManaged: true });

    expect(screen.getByTestId('contextOverviewStatCardValue-sources')).toHaveTextContent('-');
    expect(screen.getByTestId('contextOverviewStatCardCaption-sources')).toHaveTextContent(
      'managed by Elastic'
    );
  });

  it('shows no knowledge documents count when it could not be loaded', () => {
    renderCards({ knowledgeDocumentsCount: undefined });

    expect(screen.getByTestId('contextOverviewStatCardValue-knowledgeDocuments')).toHaveTextContent(
      '-'
    );
  });

  it('shows a skeleton instead of the knowledge documents count while it loads', () => {
    renderCards({ isLoading: true });

    expect(
      screen.queryByTestId('contextOverviewStatCardValue-knowledgeDocuments')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('contextOverviewStatCardValue-sources')).toBeInTheDocument();
  });

  it.each([
    ['knowledgeDocuments', '/ai_index/my-index/knowledge_documents'],
    ['sources', '/ai_index/my-index/sources'],
    ['automations', '/ai_index/my-index/settings'],
  ])('opens the matching page from the %s card', (id, path) => {
    renderCards();

    const link = within(screen.getByTestId(`contextOverviewStatCard-${id}`)).getByRole('link');
    expect(link).toHaveAttribute('href', `/app/context_engine${path}`);

    fireEvent.click(link);

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(path);
  });
});
