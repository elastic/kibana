/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { listKiTestAiIndex, renderListKiWithProviders } from './test_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

describe('ListKiBody', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton on first load', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: true,
      isFetching: true,
      error: undefined,
      refetch: jest.fn(),
    });
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiRows')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: new Error('boom'),
      refetch: jest.fn(),
    });
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiError')).toHaveTextContent(
      'Unable to load Knowledge Indicators.'
    );
  });

  it('shows table loading state while refetching results', () => {
    mockUseListKi.mockReturnValue({
      kis: [
        {
          id: 'ki-1',
          index: 'ai-index-idx-sample-ki',
          type: 'playbook',
          title: 'Refund playbook',
        },
      ],
      total: 1,
      summary: { total: 1, countsByType: [] },
      isLoading: false,
      isFetching: true,
      error: undefined,
      refetch: jest.fn(),
    });
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiRows')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiTable')).toHaveClass('euiBasicTable-loading');
  });

  it('shows empty state', () => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    });
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiSearchBox')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiTypeFilters')).toBeInTheDocument();
  });
});
