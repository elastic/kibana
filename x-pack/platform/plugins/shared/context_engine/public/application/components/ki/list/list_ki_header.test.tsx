/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  listKiTestAiIndex,
  renderListKiWithProviders,
  SAMPLE_DISCOVER_URL,
  SAMPLE_INDEX_MANAGEMENT_URL,
} from './test_helpers';
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

  it('renders type filters and backing index link', async () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiTypeFilters')).toHaveTextContent('All (6)');
    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-playbook')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('contextListKiPanelDestLink')).toHaveAttribute(
        'href',
        SAMPLE_INDEX_MANAGEMENT_URL
      );
    });
  });

  it('renders plain dest text without index management access', async () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, {
      indexManagementMonitor: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('contextListKiPanelDest')).toHaveTextContent(
        'ai-index-idx-sample-ki'
      );
    });
    expect(screen.queryByTestId('contextListKiPanelDestLink')).not.toBeInTheDocument();
  });

  it('requests a type filter when a type is selected', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    selectTypeFilter('playbook');
    expect(mockUseListKi).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'playbook' }));
  });

  it('keeps all filter options after selecting a type', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    selectTypeFilter('playbook');
    fireEvent.click(screen.getByTestId('contextListKiTypeFilters'));
    expect(screen.getByTestId('contextListKiFilter-all')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilter-faq')).toBeInTheDocument();
  });

  it('keeps backing index label when a type is selected', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    selectTypeFilter('playbook');
    expect(screen.getByTestId('contextListKiPanelSummary')).toHaveTextContent(
      'Backing index ai-index-idx-sample-ki'
    );
  });

  it('renders Discover link when available', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextListKiDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
  });

  it('hides Discover link when unavailable', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, { discoverShow: false });
    expect(screen.queryByTestId('contextListKiDiscoverLink')).not.toBeInTheDocument();
  });

  it('renders index pattern dest as plain text', () => {
    renderListKiWithProviders(
      <ListKiPanel
        aiIndex={{
          ...listKiTestAiIndex,
          dest: { type: 'index', value: 'ai-index-idx-logs-*' },
        }}
      />
    );
    expect(screen.getByTestId('contextListKiPanelDest')).toHaveTextContent('ai-index-idx-logs-*');
    expect(screen.queryByTestId('contextListKiPanelDestLink')).not.toBeInTheDocument();
  });
});
