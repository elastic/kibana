/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
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
      expect.objectContaining({ lifecycleStatus: ['active'], query: undefined, type: undefined })
    );
  });
});
