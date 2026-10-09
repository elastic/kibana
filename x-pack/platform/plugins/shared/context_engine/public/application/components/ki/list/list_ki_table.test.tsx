/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { getViewKiPath } from '../../../paths';
import { listKiTestAiIndex, renderListKiWithProviders } from './list_ki_test_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();
const mockNavigateToContextEngine = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    createContextEngineUrl: (path: string) => path,
    navigateToContextEngine: mockNavigateToContextEngine,
  }),
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

  it('navigates to KI detail when a row is clicked', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.click(screen.getByTestId('contextKiRow'));
    expect(mockNavigateToContextEngine).toHaveBeenCalledWith(getViewKiPath('sample-ki', 'ki-1'), {
      index: 'ai-index-idx-sample-ki',
    });
  });

  it('renders row title', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    expect(screen.getByTestId('contextKiRowTitle')).toHaveTextContent('Refund playbook');
  });
});
