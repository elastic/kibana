/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ContentListProvider } from '@kbn/content-list';
import {
  CONTENT_LIST_ACTIONS,
  contentListQueryClient,
  useContentListSelection,
  useContentListState,
} from '@kbn/content-list-provider';
import type { ContentListItem } from '@kbn/content-list';
import { I18nProvider } from '@kbn/i18n-react';
import { useRulesSelectionMode } from './use_rules_selection_mode';

const pageItems: ContentListItem[] = [
  { id: 'rule-1', title: 'Rule One' },
  { id: 'rule-2', title: 'Rule Two' },
];

const createWrapper =
  (total = 40) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <I18nProvider>
        <ContentListProvider
          id="rules-selection-mode-test"
          labels={{ entity: 'rule', entityPlural: 'rules' }}
          dataSource={{
            findItems: async () => ({ items: pageItems, total }),
          }}
          item={{}}
          features={{
            sorting: { initialSort: { field: 'name', direction: 'asc' } },
            pagination: { initialPageSize: 20 },
            search: true,
            selection: true,
          }}
        >
          {children}
        </ContentListProvider>
      </I18nProvider>
    );

const waitForItems = async (result: {
  current: {
    contentSelection: { isSupported: boolean };
    state?: { state: { items: ContentListItem[] } };
  };
}) => {
  await waitFor(() => {
    expect(result.current.contentSelection.isSupported).toBe(true);
  });
  // After clearing the shared Content List QueryClient, wait until findItems
  // has populated the page — selectAllMatching no-ops on an empty items array.
  if (result.current.state) {
    await waitFor(() => {
      expect(result.current.state!.state.items.length).toBeGreaterThan(0);
    });
  }
};

describe('useRulesSelectionMode', () => {
  beforeEach(() => {
    contentListQueryClient.clear();
  });

  it('reports selectedCount equal to the IDs that getBulkParams will target', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.contentSelection.setSelection(pageItems);
    });

    expect(result.current.selectionMode.selectedCount).toBe(2);
    expect(result.current.selectionMode.getBulkParams()).toEqual({
      mode: 'by_ids',
      ids: ['rule-1', 'rule-2'],
    });

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });

    expect(result.current.selectionMode.isAllSelected).toBe(true);
    expect(result.current.selectionMode.selectedCount).toBe(40);
    expect(result.current.selectionMode.getBulkParams()).toEqual({
      mode: 'by_query',
      match_all: true,
    });
  });

  it('clears page selection when the query changes', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper() }
    );

    await waitForItems(result);

    act(() => {
      result.current.contentSelection.setSelection(pageItems);
    });
    expect(result.current.selectionMode.selectedCount).toBe(2);

    act(() => {
      result.current.state.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'cpu' },
      });
    });

    await waitFor(() => {
      expect(result.current.contentSelection.selectedCount).toBe(0);
      expect(result.current.selectionMode.selectedCount).toBe(0);
    });
  });

  it('resets allMatching so select-all cannot outlive the filter that produced it', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });
    expect(result.current.selectionMode.isAllSelected).toBe(true);
    expect(result.current.selectionMode.getBulkParams()).toEqual({
      mode: 'by_query',
      match_all: true,
    });

    act(() => {
      result.current.state.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: 'enabled:true' },
      });
    });

    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(false);
      expect(result.current.selectionMode.getBulkParams()).toEqual({
        mode: 'by_ids',
        ids: [],
      });
    });
  });

  it('exits allMatching when every row on the page is deselected', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });
    expect(result.current.selectionMode.isAllSelected).toBe(true);
    expect(result.current.selectionMode.selectedCount).toBe(40);

    act(() => {
      result.current.contentSelection.clearSelection();
    });

    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(false);
      expect(result.current.selectionMode.selectedCount).toBe(0);
      expect(result.current.selectionMode.getBulkParams()).toEqual({
        mode: 'by_ids',
        ids: [],
      });
    });
  });

  it('preserves allMatching across page-index changes without re-checking rows', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });
    expect(result.current.selectionMode.isAllSelected).toBe(true);

    act(() => {
      result.current.state.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 1 },
      });
    });

    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(true);
      expect(result.current.selectionMode.selectedCount).toBe(40);
      expect(result.current.selectionMode.getBulkParams()).toEqual({
        mode: 'by_query',
        match_all: true,
      });
    });
    // Content List clears selection on page change and the hook leaves it
    // cleared, so the new page's rows render unchecked.
    expect(result.current.contentSelection.selectedIds).toEqual([]);
  });

  it('exits allMatching when the user checks a row on a later page', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });

    act(() => {
      result.current.state.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX,
        payload: { index: 1 },
      });
    });
    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(true);
    });

    act(() => {
      result.current.contentSelection.setSelection([pageItems[0]]);
    });

    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(false);
      expect(result.current.selectionMode.getBulkParams()).toEqual({
        mode: 'by_ids',
        ids: ['rule-1'],
      });
    });
  });

  it('exits allMatching when the page size changes', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitForItems(result);

    act(() => {
      result.current.selectionMode.selectAllMatching();
    });
    expect(result.current.selectionMode.isAllSelected).toBe(true);

    act(() => {
      result.current.state.dispatch({
        type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE,
        payload: { size: 10 },
      });
    });

    await waitFor(() => {
      expect(result.current.selectionMode.isAllSelected).toBe(false);
      expect(result.current.selectionMode.selectedCount).toBe(0);
    });
  });
});
