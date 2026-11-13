/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { listKiTestAiIndex } from './test_helpers';
import { useListKiPanel } from './use_list_ki_panel';

const mockUseListKi = jest.fn();
const mockUseListKiByType = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: (...args: unknown[]) => mockUseListKiByType(...args),
}));

const listKiQuery = () => mockUseListKi.mock.calls.at(-1)?.[0];
const byTypeQuery = () => mockUseListKiByType.mock.calls.at(-1)?.[0];

const renderPanelHook = () => {
  const history = createMemoryHistory({
    initialEntries: ['/ai_index/sample-ki/knowledge_indicators'],
  });
  return renderHook(() => useListKiPanel(listKiTestAiIndex), {
    wrapper: ({ children }) => <Router history={history}>{children}</Router>,
  });
};

describe('useListKiPanel', () => {
  beforeEach(() => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
    mockUseListKiByType.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps query undefined until search is submitted', () => {
    const { result } = renderPanelHook();

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchTextChange('refund');
    });

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchSubmit('refund');
    });

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: 'refund' }));
    expect(result.current.submittedQuery).toBe('refund');
  });

  it('trims text when committing search but keeps what the user typed', () => {
    const { result } = renderPanelHook();

    act(() => {
      result.current.onSearchTextChange('  refund  ');
      result.current.onSearchSubmit('  refund  ');
    });

    expect(result.current.searchText).toBe('  refund  ');
    expect(result.current.submittedQuery).toBe('refund');
    expect(listKiQuery()).toEqual(expect.objectContaining({ query: 'refund' }));
  });

  it('loads the first page without a type, 25 rows', () => {
    renderPanelHook();
    expect(listKiQuery()).toEqual(
      expect.objectContaining({ size: 25, type: undefined, lifecycleStatus: ['active'] })
    );
  });

  it('keeps "Show more" sizes per type and resets them when a filter changes', () => {
    const { result } = renderPanelHook();

    act(() => {
      result.current.showMore('faq', 25);
      result.current.showMore('playbook', 3);
    });
    expect(byTypeQuery()).toEqual(
      expect.objectContaining({ sizesByType: { faq: 50, playbook: 28 } })
    );

    act(() => {
      result.current.onStatusFilterChange('deleted');
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: {} }));
    expect(listKiQuery()).toEqual(expect.objectContaining({ lifecycleStatus: ['deleted'] }));

    act(() => {
      result.current.showMore('faq', 25);
      result.current.onTypeFilterChange({ kind: 'type', value: 'playbook' });
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: {} }));
    expect(listKiQuery()).toEqual(expect.objectContaining({ type: 'playbook' }));

    act(() => {
      result.current.showMore('faq', 25);
      result.current.onSearchSubmit('refund');
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: {} }));
  });

  it('caps "Show more" at 100 rows', () => {
    const { result } = renderPanelHook();

    act(() => {
      result.current.showMore('faq', 90);
    });

    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: { faq: 100 } }));
  });

  it('reports active filters and clears them', () => {
    const { result } = renderPanelHook();
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.onStatusFilterChange('all');
      result.current.onSearchTextChange('refund');
      result.current.onSearchSubmit('refund');
    });
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchText).toBe('');
    expect(result.current.statusFilter).toBe('active');
  });
});
