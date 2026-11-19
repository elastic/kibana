/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
import { ListKiPanel } from './list_ki_panel';
import { LIST_KI_SEARCH_DEBOUNCE_MS } from './list_ki_search_box';

const mockUseListKiGroups = jest.fn();

// The "Other" groups (the call with `excludeTypes`) are not part of these tests.
jest.mock('../../../hooks/use_list_ki_groups', () => ({
  useListKiGroups: (args: { excludeTypes?: readonly string[] }) =>
    args.excludeTypes !== undefined
      ? {
          groups: [],
          total: 0,
          totalOther: 0,
          isLoading: true,
          isFetching: false,
          isPreviousData: false,
          error: undefined,
        }
      : mockUseListKiGroups(args),
}));

describe('ListKiFiltersRow', () => {
  beforeEach(() => {
    mockUseListKiGroups.mockReturnValue({
      groups: [
        {
          type: 'playbook',
          count: 1,
          kis: [
            {
              id: 'ki-1',
              index: 'ai-index-idx-sample-ki',
              type: 'playbook',
              title: 'Refund playbook',
            },
          ],
        },
      ],
      total: 1,
      totalOther: 0,
      isLoading: false,
      isFetching: false,
      isPreviousData: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders search, status and sort, and no Type button (the tiles replace it)', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiSearchBox')).toHaveAttribute(
      'placeholder',
      'Search by title or description'
    );
    expect(screen.getByTestId('contextListKiStatusFilter')).toHaveValue('active');
    expect(screen.getByTestId('contextListKiSortSelect')).toHaveValue('updated');
    expect(screen.queryByTestId('contextListKiTypeFilters')).not.toBeInTheDocument();
  });

  it('requests expired documents for the Expired status', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'expired' },
    });

    expect(screen.getByTestId('contextListKiStatusFilter')).toHaveValue('expired');
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['expired'] })
    );
  });

  it('requests recently updated first by default and title order for Title A to Z', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'updated' })
    );

    fireEvent.change(screen.getByTestId('contextListKiSortSelect'), {
      target: { value: 'title' },
    });

    expect(screen.getByTestId('contextListKiSortSelect')).toHaveValue('title');
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'title' })
    );
  });

  it('requests every status for All statuses', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'all' },
    });
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: ['active', 'deleted', 'verification_failed', 'expired'],
      })
    );
  });

  it('requests the 5 biggest types with 50 rows each, active KIs by default', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['active'], maxGroups: 5, previewSize: 50 })
    );
  });

  it('submits search on Enter', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const searchBox = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(searchBox, { target: { value: 'refund' } });
    fireEvent.keyDown(searchBox, { key: 'Enter', code: 'Enter' });
    expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'refund' })
    );
  });

  it('searches after a short pause while typing', () => {
    jest.useFakeTimers();
    try {
      renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
      fireEvent.change(screen.getByTestId('contextListKiSearchBox'), {
        target: { value: 'refund' },
      });
      expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: undefined })
      );
      act(() => {
        jest.advanceTimersByTime(LIST_KI_SEARCH_DEBOUNCE_MS);
      });
      expect(mockUseListKiGroups).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'refund' })
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
