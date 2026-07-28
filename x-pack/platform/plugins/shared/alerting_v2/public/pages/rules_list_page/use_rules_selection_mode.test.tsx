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

describe('useRulesSelectionMode', () => {
  it('reports selectedCount equal to the IDs that getBulkParams will target', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitFor(() => expect(result.current.contentSelection.isSupported).toBe(true));

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

    await waitFor(() => expect(result.current.contentSelection.isSupported).toBe(true));

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

    await waitFor(() => expect(result.current.contentSelection.isSupported).toBe(true));

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
      }),
      { wrapper: createWrapper(40) }
    );

    await waitFor(() => expect(result.current.contentSelection.isSupported).toBe(true));

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

  it('preserves allMatching across page-index changes and re-checks visible rows', async () => {
    const { result } = renderHook(
      () => ({
        selectionMode: useRulesSelectionMode(),
        contentSelection: useContentListSelection(),
        state: useContentListState(),
      }),
      { wrapper: createWrapper(40) }
    );

    await waitFor(() => expect(result.current.contentSelection.isSupported).toBe(true));

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
      // Content List clears selection on page change; the hook re-syncs rows.
      expect(result.current.contentSelection.selectedIds).toEqual(['rule-1', 'rule-2']);
    });
  });
});
