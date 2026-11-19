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

const mockUseListKiGroups = jest.fn();

jest.mock('../../../hooks/use_list_ki_groups', () => ({
  useListKiGroups: (...args: unknown[]) => mockUseListKiGroups(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: () => ({}),
}));

describe('ListKiPanel', () => {
  beforeEach(() => {
    mockUseListKiGroups.mockReturnValue({
      groups: [
        {
          type: 'playbook',
          count: 6,
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
      total: 6,
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

  it('composes the header, the tiles, the filters row, the list and the viewer column', () => {
    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);

    expect(screen.getByTestId('contextListKiPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiHeaderCount')).toHaveTextContent(
      '6 Knowledge documents'
    );
    expect(screen.getByTestId('contextListKiTiles')).toBeInTheDocument();
    expect(screen.queryByTestId('contextListKiTileOther')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextListKiFilters')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiList')).toBeInTheDocument();
    expect(screen.getByTestId('contextListKiViewerColumn')).toBeInTheDocument();
  });
});
