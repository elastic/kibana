/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
import { ListKiBody } from './list_ki_body';
import type { ListKiGroup } from './list_ki_groups_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: () => ({}),
}));

const listResult = (overrides: Record<string, unknown> = {}) => ({
  kis: [],
  total: 0,
  summary: { total: 0, countsByType: [] },
  isLoading: false,
  isFetching: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

describe('ListKiBody', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton on first load', () => {
    mockUseListKi.mockReturnValue(listResult({ isLoading: true, isFetching: true }));
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiList')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseListKi.mockReturnValue(listResult({ error: new Error('boom') }));
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiError')).toHaveTextContent(
      'Unable to load Knowledge documents.'
    );
  });

  it('marks the list busy while refetching results', () => {
    mockUseListKi.mockReturnValue(
      listResult({
        kis: [{ id: 'ki-1', index: 'idx', type: 'playbook', title: 'Refund playbook' }],
        total: 1,
        summary: { total: 1, countsByType: [{ type: 'playbook', count: 1 }] },
        isFetching: true,
      })
    );
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiList')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows empty state without filters', () => {
    mockUseListKi.mockReturnValue(listResult());
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiSearchBox')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiTypeFilters')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiViewerColumn')).not.toBeInTheDocument();
  });

  it('shows "Nothing matches" with Clear filters when filters hide everything', () => {
    mockUseListKi.mockReturnValue(listResult());
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'deleted' },
    });

    expect(screen.getByTestId('contextListKiNoResults')).toHaveTextContent(
      'Nothing matches these filters.'
    );
    expect(screen.queryByTestId('contextListKiViewerColumn')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextListKiClearFilters'));
    expect(screen.getByTestId('contextListKiStatusFilter')).toHaveValue('active');
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['active'], query: undefined, type: undefined })
    );
  });
  describe('with a selected document', () => {
    const group: ListKiGroup = {
      type: 'playbook',
      count: 1,
      kis: [
        { id: 'ki-1', index: 'idx', type: 'playbook', title: 'Refund playbook', status: 'active' },
      ],
      canShowMore: false,
      isCapReached: false,
      isLoadingMore: false,
    };

    /** Stands in for the viewer with an unsaved edit: the draft lives in its own state. */
    const DraftViewer = () => {
      const [draft, setDraft] = useState('');
      return (
        <input
          data-test-subj="testDraft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      );
    };

    /** The list starts with rows; the button empties it like a filter that matches nothing. */
    const BodyWithFilter = () => {
      const [isFiltered, setIsFiltered] = useState(false);
      return (
        <>
          <button data-test-subj="testApplyFilter" onClick={() => setIsFiltered(true)} />
          <ListKiBody
            aiIndexId="sample-ki"
            groups={isFiltered ? [] : [group]}
            onSelectKi={jest.fn()}
            onShowMore={jest.fn()}
            hasActiveFilters={isFiltered}
            onClearFilters={jest.fn()}
            isLoading={false}
            viewer={<DraftViewer />}
          />
        </>
      );
    };

    it('keeps an unsaved draft when a filter hides every row', () => {
      renderListKiWithProviders(<BodyWithFilter />);
      fireEvent.change(screen.getByTestId('testDraft'), { target: { value: 'my draft' } });

      fireEvent.click(screen.getByTestId('testApplyFilter'));

      expect(screen.getByTestId('contextListKiNoResults')).toBeInTheDocument();
      expect(screen.queryByTestId('contextKiRow')).not.toBeInTheDocument();
      expect(screen.getByTestId('testDraft')).toHaveValue('my draft');
    });

    it('keeps the viewer open next to an empty list (a shared link still opens)', () => {
      renderListKiWithProviders(
        <ListKiBody
          aiIndexId="sample-ki"
          groups={[]}
          onSelectKi={jest.fn()}
          onShowMore={jest.fn()}
          hasActiveFilters={false}
          onClearFilters={jest.fn()}
          isLoading={false}
          viewer={<div data-test-subj="testViewer" />}
        />
      );

      expect(screen.getByTestId('contextListKiEmpty')).toBeInTheDocument();
      expect(screen.getByTestId('testViewer')).toBeInTheDocument();
    });
  });
});
