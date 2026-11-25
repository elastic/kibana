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

const mockUseListKiGroups = jest.fn();

jest.mock('../../../hooks/use_list_ki_groups', () => ({
  useListKiGroups: (...args: unknown[]) => mockUseListKiGroups(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: () => ({}),
}));

const groupsResult = (overrides: Record<string, unknown> = {}) => ({
  groups: [],
  total: 0,
  totalOther: 0,
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
  ...overrides,
});

describe('ListKiBody', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton on first load', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult({ isLoading: true, isFetching: true }));
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiList')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult({ error: new Error('boom') }));
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiError')).toHaveTextContent(
      'Unable to load Knowledge documents.'
    );
  });

  it('marks the list busy while refetching results', () => {
    mockUseListKiGroups.mockReturnValue(
      groupsResult({
        groups: [
          {
            type: 'playbook',
            count: 1,
            kis: [{ id: 'ki-1', index: 'idx', type: 'playbook', title: 'Refund playbook' }],
          },
        ],
        total: 1,
        isFetching: true,
      })
    );
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiList')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows empty state without filters', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult());
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiSearchBox')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiTiles')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiViewerColumn')).not.toBeInTheDocument();
  });

  it('shows "Nothing matches" with Clear filters when filters hide everything', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult());
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
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['active'], query: undefined })
    );
  });
  describe('with a selected document', () => {
    const group: ListKiGroup = {
      key: 'type:playbook',
      kind: 'type',
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
