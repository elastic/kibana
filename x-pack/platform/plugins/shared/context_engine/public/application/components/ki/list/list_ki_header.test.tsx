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

const stableCountsByType = [
  { type: 'playbook', count: 1 },
  { type: 'policy', count: 1 },
  { type: 'faq', count: 4 },
];

const selectTypeFilter = (type: string) => {
  fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
  fireEvent.click(screen.getByTestId(`contextListKiFilter-${type}`));
};

describe('ListKiHeader', () => {
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

  it('renders search, status and type filters', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiSearchBox')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiStatusFilters')).toHaveTextContent('Status');
    expect(screen.getByTestId('contextListKiTypeFilters')).toHaveTextContent('Type');
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-playbook')).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('contextListKiStatusFilters'));
    fireEvent.click(screen.getByTestId('contextListKiStatusFilter-deleted'));
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

  it('shows the submit button when the search box has text', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.change(screen.getByTestId('contextListKiSearchBox'), { target: { value: 'refund' } });
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeInTheDocument();
  });

  it('commits search when submit is clicked', () => {
    const refetch = jest.fn();
    mockUseListKi.mockImplementation(() => ({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch,
    }));

    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const searchBox = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(searchBox, { target: { value: 'refund' } });
    fireEvent.click(screen.getByTestId('contextListKiSearchSubmitButton'));
    expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'refund' }));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('disables submit after the current text is committed', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const searchBox = screen.getByTestId('contextListKiSearchBox');
    fireEvent.change(searchBox, { target: { value: 'refund' } });
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeEnabled();
    fireEvent.keyDown(searchBox, { key: 'Enter', code: 'Enter' });
    expect(screen.getByTestId('contextListKiSearchSubmitButton')).toBeDisabled();
  });
});
