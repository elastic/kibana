/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { KI_NOT_DELETED_STATUSES } from '../../../../common/ki_lifecycle_status';
import {
  RECENT_KNOWLEDGE_DOCUMENTS_SIZE,
  RecentKnowledgeDocumentsPanel,
} from './recent_knowledge_documents_panel';

jest.mock('../../hooks/use_list_ki');
jest.mock('../../hooks/use_navigation');

const { useListKi: mockUseListKi } = jest.requireMock('../../hooks/use_list_ki');
const { useNavigation: mockUseNavigation } = jest.requireMock('../../hooks/use_navigation');
const mockNavigateToContextEngine = jest.fn();

const kis: KiListItem[] = [
  {
    id: 'doc-1',
    index: 'ai-index-idx-my-index',
    type: 'runbook',
    title: 'Restart the web tier',
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  { id: 'doc-2', index: '', status: 'active' },
];

const listKiResult = (
  overrides: { kis?: KiListItem[]; isLoading?: boolean; error?: Error } = {}
) => ({
  kis,
  total: kis.length,
  summary: { total: kis.length, countsByType: [] },
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const renderPanel = ({ isMemoryEnabled = false, isManaged = false } = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <RecentKnowledgeDocumentsPanel
          aiIndexId="my-index"
          isManaged={isManaged}
          isMemoryEnabled={isMemoryEnabled}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('RecentKnowledgeDocumentsPanel', () => {
  beforeEach(() => {
    mockUseListKi.mockReturnValue(listKiResult());
    mockUseNavigation.mockReturnValue({
      createContextEngineUrl: (path: string, params?: Record<string, string>) =>
        `/app/context_engine${path}${params ? `?${new URLSearchParams(params)}` : ''}`,
      navigateToContextEngine: mockNavigateToContextEngine,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads the most recently updated documents that are not deleted', () => {
    renderPanel();

    expect(mockUseListKi).toHaveBeenCalledWith({
      aiIndexId: 'my-index',
      size: RECENT_KNOWLEDGE_DOCUMENTS_SIZE,
      status: KI_NOT_DELETED_STATUSES,
      sort: 'updated',
    });
  });

  it('lists the documents with title, type and update time', () => {
    renderPanel();

    const rows = screen.getAllByTestId('contextOverviewRecentDocumentRow');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Restart the web tier');
    expect(rows[0]).toHaveTextContent('runbook');
    expect(rows[0]).toHaveTextContent('3 hours ago');
    expect(rows[1]).toHaveTextContent('Untitled');
  });

  it('opens a document from its row', () => {
    renderPanel();

    const [firstRow, secondRow] = screen.getAllByTestId('contextOverviewRecentDocumentRow');
    expect(firstRow).toHaveAttribute(
      'href',
      '/app/context_engine/ai_index/my-index/knowledge_documents/ai-index-idx-my-index?doc=doc-1'
    );
    expect(secondRow).toHaveAttribute(
      'href',
      '/app/context_engine/ai_index/my-index/knowledge_documents?doc=doc-2'
    );

    fireEvent.click(firstRow);

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(
      '/ai_index/my-index/knowledge_documents/ai-index-idx-my-index',
      { doc: 'doc-1' }
    );
  });

  it('opens the Knowledge documents tab from "View all"', () => {
    renderPanel();

    const viewAll = screen.getByTestId('contextOverviewRecentDocumentsViewAll');
    expect(viewAll).toHaveAttribute(
      'href',
      '/app/context_engine/ai_index/my-index/knowledge_documents'
    );

    fireEvent.click(viewAll);

    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(
      '/ai_index/my-index/knowledge_documents'
    );
  });

  it('shows a skeleton while the documents load', () => {
    mockUseListKi.mockReturnValue(listKiResult({ kis: [], isLoading: true }));

    renderPanel();

    expect(screen.getByTestId('contextOverviewRecentDocumentsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextOverviewRecentDocumentsEmpty')).not.toBeInTheDocument();
  });

  it('explains where documents come from when there are none', () => {
    mockUseListKi.mockReturnValue(listKiResult({ kis: [] }));

    renderPanel();

    expect(screen.getByTestId('contextOverviewRecentDocumentsEmpty')).toHaveTextContent(
      /^Knowledge documents appear here after you add a source\.$/
    );
    expect(screen.queryByTestId('contextOverviewRecentDocumentsViewAll')).not.toBeInTheDocument();
  });

  it('shows an error instead of the empty text when the documents fail to load', () => {
    mockUseListKi.mockReturnValue(listKiResult({ kis: [], error: new Error('boom') }));

    renderPanel();

    expect(screen.getByTestId('contextOverviewRecentDocumentsError')).toHaveTextContent(
      'Unable to load recent knowledge documents.'
    );
    expect(screen.queryByTestId('contextOverviewRecentDocumentsEmpty')).not.toBeInTheDocument();
  });

  it('keeps showing loaded documents when a refetch fails', () => {
    mockUseListKi.mockReturnValue(listKiResult({ error: new Error('boom') }));

    renderPanel();

    expect(screen.getAllByTestId('contextOverviewRecentDocumentRow')).toHaveLength(2);
    expect(screen.queryByTestId('contextOverviewRecentDocumentsError')).not.toBeInTheDocument();
  });

  it('does not ask to add a source on a managed AI index', () => {
    mockUseListKi.mockReturnValue(listKiResult({ kis: [] }));

    renderPanel({ isManaged: true, isMemoryEnabled: true });

    expect(screen.getByTestId('contextOverviewRecentDocumentsEmpty')).toHaveTextContent(
      /^Knowledge documents appear here after Elastic's automation runs\.$/
    );
  });

  it('mentions dreaming in the empty state while memory is on', () => {
    mockUseListKi.mockReturnValue(listKiResult({ kis: [] }));

    renderPanel({ isMemoryEnabled: true });

    expect(screen.getByTestId('contextOverviewRecentDocumentsEmpty')).toHaveTextContent(
      "Knowledge documents appear here after you add a source, or after dreaming processes your agent's memories."
    );
  });
});
