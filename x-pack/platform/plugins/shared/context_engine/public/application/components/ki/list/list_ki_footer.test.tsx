/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { listKiTestAiIndex, renderListKiWithProviders, SAMPLE_DISCOVER_URL } from './test_helpers';
import { ListKiPanel } from './list_ki_panel';

const mockUseListKi = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

describe('ListKiFooter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests a larger page size when load more is clicked', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 50,
      summary: { total: 50, countsByType: [{ type: 'playbook', count: 50 }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));
    expect(mockUseListKi).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: DEFAULT_KI_PAGE_SIZE * 2 })
    );
  });

  it('shows cap reached with Discover link at max page size', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 150,
      summary: { total: 150, countsByType: [{ type: 'playbook', count: 150 }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />);
    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));
    }
    expect(screen.getByTestId('contextListKiCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.getByTestId('contextListKiCapReachedDiscoverLink')).toHaveAttribute(
      'href',
      SAMPLE_DISCOVER_URL
    );
    expect(screen.queryByTestId('contextListKiLoadMoreButton')).not.toBeInTheDocument();
  });

  it('shows cap reached without Discover when unavailable', () => {
    mockUseListKi.mockImplementation(({ size = DEFAULT_KI_PAGE_SIZE }: { size?: number }) => ({
      kis: Array.from({ length: size }, (_, index) => ({
        id: `ki-${index}`,
        index: 'ai-index-idx-sample-ki',
        type: 'playbook',
        title: `KI ${index}`,
      })),
      total: 150,
      summary: { total: 150, countsByType: [{ type: 'playbook', count: 150 }] },
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: jest.fn(),
    }));

    renderListKiWithProviders(<ListKiPanel aiIndex={listKiTestAiIndex} />, { discoverShow: false });
    const loadMoreClicks = MAX_KI_PAGE_SIZE / DEFAULT_KI_PAGE_SIZE - 1;
    for (let click = 0; click < loadMoreClicks; click++) {
      fireEvent.click(screen.getByTestId('contextListKiLoadMoreButton'));
    }
    expect(screen.getByTestId('contextListKiCapReached')).toHaveTextContent(
      `Showing the first ${MAX_KI_PAGE_SIZE} results.`
    );
    expect(screen.queryByTestId('contextListKiCapReachedDiscoverLink')).not.toBeInTheDocument();
  });
});
