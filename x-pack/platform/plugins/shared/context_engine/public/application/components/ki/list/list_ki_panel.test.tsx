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

describe('ListKiPanel', () => {
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

  it('composes header, body, and footer', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiPanelSummary')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiRows')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiLoadMoreButton')).toBeInTheDocument();
  });
});
