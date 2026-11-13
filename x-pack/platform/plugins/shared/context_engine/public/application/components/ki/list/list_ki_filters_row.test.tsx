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

const mockUseListKi = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

const stableCountsByType = [
  { type: 'playbook', count: 1 },
  { type: 'policy', count: 1 },
  { type: 'faq', count: 4 },
];

const selectTypeFilter = (type: string) => {
  fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
  fireEvent.click(screen.getByTestId(`contextListKiFilter-${type}`));
};

describe('ListKiFiltersRow', () => {
  beforeEach(() => {
    mockUseListKi.mockImplementation(({ type }: { type?: string }) => ({
      kis: [
        {
          id: 'ki-1',
          index: 'ai-index-idx-sample-ki',
          type: 'playbook',
          title: 'Refund playbook',
        },
      ],
      total: type === undefined ? 6 : 1,
      summary: { total: 6, countsByType: stableCountsByType },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders search, status, sort and type filters', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiSearchBox')).toHaveAttribute(
      'placeholder',
      'Search by title or description'
    );
    expect(screen.getByTestId('contextListKiStatusFilter')).toHaveValue('active');
    expect(screen.getByTestId('contextListKiSortSelect')).toHaveValue('updated');
    expect(screen.getByTestId('contextListKiTypeFilters')).toHaveTextContent('Type');
    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-playbook')).toBeInTheDocument();
  });

  it('shows the WIP Expired status and Title sort options as disabled', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByRole('option', { name: 'Expired' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Title A to Z' })).toBeDisabled();
  });

  it('ignores the WIP Expired status and Title sort (noop)', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'expired' },
    });
    fireEvent.change(screen.getByTestId('contextListKiSortSelect'), {
      target: { value: 'title' },
    });

    expect(screen.getByTestId('contextListKiStatusFilter')).toHaveValue('active');
    expect(screen.getByTestId('contextListKiSortSelect')).toHaveValue('updated');
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ lifecycleStatus: ['active'] })
    );
  });

  it('requests every status for All statuses', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'all' },
    });
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ lifecycleStatus: ['active', 'deleted', 'verification_failed'] })
    );
  });

  it('requests active KIs by default', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ lifecycleStatus: ['active'] })
    );
  });

  it('requests a type filter when a type is selected', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    selectTypeFilter('playbook');
    expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'playbook' }));
  });

  it('requests a status filter when deleted is selected', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiStatusFilter'), {
      target: { value: 'deleted' },
    });
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ lifecycleStatus: ['deleted'] })
    );
  });

  it('keeps all filter options after selecting a type', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    selectTypeFilter('playbook');
    expect(screen.getByTestId('contextListKiFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-faq')).toBeInTheDocument();
  });

  it('submits search on Enter', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const searchBox = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(searchBox, { target: { value: 'refund' } });
    fireEvent.keyDown(searchBox, { key: 'Enter', code: 'Enter' });
    expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'refund' }));
  });

  it('searches after a short pause while typing', () => {
    jest.useFakeTimers();
    try {
      renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
      fireEvent.change(screen.getByTestId('contextListKiSearchBox'), {
        target: { value: 'refund' },
      });
      expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ query: undefined }));
      act(() => {
        jest.advanceTimersByTime(LIST_KI_SEARCH_DEBOUNCE_MS);
      });
      expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'refund' }));
    } finally {
      jest.useRealTimers();
    }
  });
});
