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

describe('ListKiTable', () => {
  beforeEach(() => {
    mockUseListKi.mockReturnValue({
      kis: [
        {
          id: 'ki-1',
          index: 'ai-index-idx-sample-ki',
          type: 'playbook',
          title: 'Refund playbook',
        },
      ],
      total: 6,
      summary: { total: 6, countsByType: [{ type: 'playbook', count: 1 }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selects the Knowledge document in the URL when a row is clicked', () => {
    const { history } = renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.click(screen.getByTestId('contextKiRow'));
    expect(history.location.pathname).toBe('/ai_index/sample-ki/knowledge_indicators');
    expect(history.location.search).toBe('?doc=ki-1&index=ai-index-idx-sample-ki');
  });

  it('renders row title', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('Refund playbook');
  });

  it('renders an expired status badge when expires_at is in the past', () => {
    mockUseListKi.mockReturnValue({
      kis: [
        {
          id: 'ki-expired',
          index: 'ai-index-idx-sample-ki',
          title: 'Old memory',
          expires_at: '2000-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      summary: { total: 1, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    });
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextKiRowLifecycleStatus')).toHaveTextContent('expired');
  });
});
