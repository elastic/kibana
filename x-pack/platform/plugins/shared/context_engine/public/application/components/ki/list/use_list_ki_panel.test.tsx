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
import type { KiGroup, KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { listKiTestAiIndex } from './test_helpers';
import { useListKiPanel } from './use_list_ki_panel';

const mockUseListKi = jest.fn();
const mockUseListKiByType = jest.fn();
const mockUseListKiGroups = jest.fn();
// The "Other" groups: the `_groups` call that leaves out the tile types.
const mockUseOtherKiGroups = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

jest.mock('../../../hooks/use_list_ki_by_type', () => ({
  useListKiByType: (...args: unknown[]) => mockUseListKiByType(...args),
}));

jest.mock('../../../hooks/use_list_ki_groups', () => ({
  useListKiGroups: (args: { excludeTypes?: readonly string[] }) =>
    args.excludeTypes !== undefined ? mockUseOtherKiGroups(args) : mockUseListKiGroups(args),
}));

const groupsQuery = () => mockUseListKiGroups.mock.calls.at(-1)?.[0];
const otherGroupsQuery = () => mockUseOtherKiGroups.mock.calls.at(-1)?.[0];
const otherQuery = () => mockUseListKi.mock.calls.at(-1)?.[0];
const byTypeQuery = () => mockUseListKiByType.mock.calls.at(-1)?.[0];

const ki = (id: string, type?: string): KiListItem => ({
  id,
  index: 'ai-index-idx-sample-ki',
  ...(type !== undefined ? { type } : {}),
  status: 'active',
});

const rows = (count: number, type: string) =>
  Array.from({ length: count }, (_, position) => ki(`${type}-${position}`, type));

const GROUPS: KiGroup[] = [
  { type: 'faq', count: 40, kis: rows(10, 'faq') },
  { type: 'playbook', count: 3, kis: rows(3, 'playbook') },
];

const groupsResult = (overrides: Record<string, unknown> = {}) => ({
  groups: GROUPS,
  total: 48,
  totalOther: 5,
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
  ...overrides,
});

const otherResult = (overrides: Record<string, unknown> = {}) => ({
  kis: [],
  total: 0,
  summary: { total: 0, countsByType: [] },
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const renderPanelHook = (initialPath = '/ai_index/sample-ki/knowledge_documents') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const view = renderHook(() => useListKiPanel(listKiTestAiIndex), {
    wrapper: ({ children }) => <Router history={history}>{children}</Router>,
  });
  return { ...view, history };
};

const tile = (result: { current: ReturnType<typeof useListKiPanel> }, key: string) => {
  const found = result.current.tiles.find((candidate) => candidate.key === key);
  if (!found) {
    throw new Error(`No tile ${key}`);
  }
  return found;
};

describe('useListKiPanel', () => {
  beforeEach(() => {
    mockUseListKiGroups.mockReturnValue(groupsResult());
    // By default "Other" has no type big enough for a group: all of it is the flat rest.
    mockUseOtherKiGroups.mockReturnValue(groupsResult({ groups: [], total: 5, totalOther: 5 }));
    mockUseListKi.mockReturnValue(otherResult());
    mockUseListKiByType.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads the 5 biggest types with 50 rows each, active KIs, newest first', () => {
    renderPanelHook();
    expect(groupsQuery()).toEqual(
      expect.objectContaining({
        maxGroups: 5,
        previewSize: 50,
        status: ['active'],
        sort: 'updated',
      })
    );
  });

  it('keeps the tiles while searching, with live counts, and keeps a type selection strict', () => {
    // The tile request has no search; the search request asks for exactly the tile types.
    mockUseListKiGroups.mockImplementation(({ query }: { query?: string }) =>
      query === undefined
        ? groupsResult()
        : groupsResult({
            groups: [{ type: 'faq', count: 2, kis: rows(2, 'faq') }],
            total: 3,
            totalOther: 1,
          })
    );
    const { result } = renderPanelHook();

    act(() => {
      result.current.onToggleTile(tile(result, 'type:playbook'));
    });
    act(() => {
      result.current.onSearchSubmit('refund');
    });

    const calls = mockUseListKiGroups.mock.calls.slice(-2).map(([args]) => args);
    expect(calls[0].query).toBeUndefined();
    expect(calls[0]).not.toHaveProperty('types');
    expect(calls[1]).toEqual(
      expect.objectContaining({ query: 'refund', types: ['faq', 'playbook'], enabled: true })
    );

    // Same tiles, counts from the search: playbook has no match.
    expect(result.current.tiles.map(({ key, count }) => [key, count])).toEqual([
      ['type:faq', 2],
      ['type:playbook', 0],
      ['other', 1],
    ]);
    // Playbook stays selected, and the list does not fall back to other types.
    expect(result.current.selection.types.has('playbook')).toBe(true);
    expect(result.current.groups).toEqual([]);
    expect(result.current.total).toBe(3);
  });

  it('does not flash the answer of a search from before a cleared search', () => {
    const fooGroups = [{ type: 'faq', count: 1, kis: rows(1, 'faq') }];
    // The search request keeps the "foo" answer as previous data (also while it is disabled).
    mockUseListKiGroups.mockImplementation(
      ({ query, types }: { query?: string; types?: string[] }) => {
        if (types === undefined) {
          return groupsResult();
        }
        return query === 'foo'
          ? groupsResult({ groups: fooGroups, total: 1, totalOther: 0 })
          : groupsResult({ groups: fooGroups, total: 1, totalOther: 0, isPreviousData: true });
      }
    );
    const { result } = renderPanelHook();

    act(() => {
      result.current.onSearchSubmit('foo');
    });
    expect(result.current.total).toBe(1);

    act(() => {
      result.current.onSearchSubmit('');
    });
    act(() => {
      result.current.onSearchSubmit('bar');
    });
    // While "bar" loads: the full list, not the "foo" answer.
    expect(result.current.total).toBe(48);
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:faq', 'type:playbook']);
  });

  it('loads more rows of a type even when the type is named like an object key', () => {
    mockUseListKiGroups.mockReturnValue(
      groupsResult({ groups: [{ type: 'constructor', count: 80, kis: rows(50, 'constructor') }] })
    );
    const { result } = renderPanelHook();

    act(() => {
      result.current.showMore('type:constructor', 50);
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: { constructor: 100 } }));
  });

  it('keeps "Show more" (as a retry) and shows a toast when the "Other" request fails', () => {
    const refetch = jest.fn();
    mockUseListKi.mockReturnValue(otherResult({ error: new Error('boom'), refetch }));
    const { result } = renderPanelHook();

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherQuery()).toEqual(expect.objectContaining({ notifyOnError: true }));
    const [otherSection] = result.current.groups;
    expect(otherSection).toMatchObject({ key: 'other', count: 5, canShowMore: true });

    act(() => {
      result.current.showMore('other', 0);
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps query undefined until search is submitted, and trims it', () => {
    const { result } = renderPanelHook();
    expect(groupsQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchTextChange('  refund  ');
    });
    expect(groupsQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchSubmit('  refund  ');
    });
    expect(result.current.searchText).toBe('  refund  ');
    expect(result.current.submittedQuery).toBe('refund');
    expect(groupsQuery()).toEqual(expect.objectContaining({ query: 'refund' }));
  });

  it('builds tiles from the groups plus "Other", and shows every group without a selection', () => {
    const { result } = renderPanelHook();
    expect(result.current.tiles.map(({ key, count }) => [key, count])).toEqual([
      ['type:faq', 40],
      ['type:playbook', 3],
      ['other', 5],
    ]);
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:faq', 'type:playbook']);
    expect(result.current.total).toBe(48);
  });

  it('does not ask for "Other" until its tile is selected, then excludes the group types', () => {
    const { result } = renderPanelHook();
    expect(otherQuery()).toEqual(expect.objectContaining({ enabled: false }));

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherQuery()).toEqual(
      expect.objectContaining({ enabled: true, excludeTypes: ['faq', 'playbook'], size: 50 })
    );
    expect(result.current.groups.map(({ key }) => key)).toEqual(['other']);
    expect(result.current.selection.other).toBe(true);
  });

  it('splits "Other" by type: its biggest types as groups, the rest as one flat section', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({
        groups: [{ type: 'zeta', count: 3, kis: rows(3, 'zeta') }],
        total: 5,
        totalOther: 2,
      })
    );
    mockUseListKi.mockReturnValue(otherResult({ kis: [ki('no-type')], total: 2 }));
    const { result } = renderPanelHook();
    expect(otherGroupsQuery()).toEqual(expect.objectContaining({ enabled: false }));

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherGroupsQuery()).toEqual(
      expect.objectContaining({
        enabled: true,
        excludeTypes: ['faq', 'playbook'],
        maxGroups: 10,
        previewSize: 50,
      })
    );
    // The rest leaves out the tile types and the "Other" groups.
    expect(otherQuery()).toEqual(
      expect.objectContaining({ enabled: true, excludeTypes: ['faq', 'playbook', 'zeta'] })
    );
    expect(result.current.groups.map(({ key, count }) => [key, count])).toEqual([
      ['type:zeta', 3],
      ['other', 2],
    ]);
  });

  it('does not ask for the rest of "Other" when its groups cover all of it', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({ groups: [{ type: 'zeta', count: 5, kis: rows(5, 'zeta') }], totalOther: 0 })
    );
    const { result } = renderPanelHook();

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherQuery()).toEqual(expect.objectContaining({ enabled: false }));
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:zeta']);
  });

  it('shows "Other" as one flat section when its groups fail', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({ groups: [], totalOther: 0, error: new Error('boom') })
    );
    mockUseListKi.mockReturnValue(otherResult({ kis: rows(5, 'zeta'), total: 5 }));
    const { result } = renderPanelHook();

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherQuery()).toEqual(
      expect.objectContaining({ enabled: true, excludeTypes: ['faq', 'playbook'] })
    );
    expect(result.current.groups.map(({ key, count }) => [key, count])).toEqual([['other', 5]]);
  });

  it('closes the open document when a filter leaves the list empty', () => {
    mockUseListKiGroups.mockImplementation(({ status }: { status: string[] }) =>
      status.includes('deleted')
        ? groupsResult({ groups: [], total: 0, totalOther: 0 })
        : groupsResult()
    );
    const { result, history } = renderPanelHook(
      '/ai_index/sample-ki/knowledge_documents/ai-index-idx-sample-ki?doc=faq-0'
    );

    act(() => {
      result.current.onStatusFilterChange('deleted');
    });
    expect(history.location.search).toBe('');
    expect(history.location.pathname).toBe('/ai_index/sample-ki/knowledge_documents');
  });

  it('keeps the open document when a filter change fails (an error is not an empty list)', () => {
    mockUseListKiGroups.mockImplementation(({ status }: { status: string[] }) =>
      status.includes('deleted')
        ? groupsResult({ groups: [], total: 0, totalOther: 0, error: new Error('boom') })
        : groupsResult()
    );
    const { result, history } = renderPanelHook(
      '/ai_index/sample-ki/knowledge_documents/ai-index-idx-sample-ki?doc=faq-0'
    );

    act(() => {
      result.current.onStatusFilterChange('deleted');
    });
    expect(history.location.search).toBe('?doc=faq-0');
  });

  it('loads more rows of a type inside "Other" and shows them', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({ groups: [{ type: 'zeta', count: 80, kis: rows(50, 'zeta') }], totalOther: 0 })
    );
    const { result } = renderPanelHook();
    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });

    // The page that "Show more" loads.
    mockUseListKiByType.mockReturnValue({
      zeta: { kis: rows(80, 'zeta'), isFetching: false, isError: false, retry: jest.fn() },
    });
    act(() => {
      result.current.showMore('type:zeta', 50);
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: { zeta: 100 } }));
    expect(result.current.groups.map(({ key, kis }) => [key, kis.length])).toEqual([
      ['type:zeta', 80],
    ]);
  });

  it('keeps the flat "Other" rows while its next page loads, without rows of "Other" groups', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({ groups: [{ type: 'zeta', count: 1, kis: rows(1, 'zeta') }], totalOther: 3 })
    );
    // The previous page: one row of a type that is now a group of its own, two that are not.
    mockUseListKi.mockReturnValue(
      otherResult({
        kis: [ki('zeta-old', 'zeta'), ki('no-type'), ki('eta-1', 'eta')],
        total: 3,
        isPreviousData: true,
        isFetching: true,
      })
    );
    const { result } = renderPanelHook();
    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });

    const other = result.current.groups.find(({ key }) => key === 'other');
    expect(other?.kis.map(({ id }) => id)).toEqual(['no-type', 'eta-1']);
    expect(other?.isLoadingMore).toBe(true);
  });

  it('keeps the "Other" groups while the tiles reload after a status change', () => {
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({ groups: [{ type: 'zeta', count: 3, kis: rows(3, 'zeta') }], totalOther: 2 })
    );
    const { result } = renderPanelHook();
    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:zeta', 'other']);

    // The tiles reload: the "Other" groups query is disabled but keeps its previous data.
    mockUseListKiGroups.mockReturnValue(groupsResult({ isPreviousData: true, isFetching: true }));
    mockUseOtherKiGroups.mockReturnValue(
      groupsResult({
        groups: [{ type: 'zeta', count: 3, kis: rows(3, 'zeta') }],
        totalOther: 2,
        isPreviousData: true,
      })
    );
    act(() => {
      result.current.onStatusFilterChange('deleted');
    });
    expect(otherGroupsQuery()).toEqual(expect.objectContaining({ enabled: false }));
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:zeta', 'other']);
  });

  it('keeps a deep-linked document when the list is empty without a filter change', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult({ groups: [], total: 0, totalOther: 0 }));
    const { history } = renderPanelHook(
      '/ai_index/sample-ki/knowledge_documents/ai-index-idx-sample-ki?doc=faq-0'
    );
    expect(history.location.search).toBe('?doc=faq-0');
  });

  it('waits for fresh groups before asking for "Other"', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult({ isPreviousData: true, isFetching: true }));
    const { result } = renderPanelHook();
    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    expect(otherQuery()).toEqual(expect.objectContaining({ enabled: false }));
  });

  it('shows the preview of a selected type without loading more rows', () => {
    const { result } = renderPanelHook();

    act(() => {
      result.current.onToggleTile(tile(result, 'type:faq'));
    });
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:faq']);
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: {} }));
  });

  it('keeps "Show more" sizes per section, caps them, and resets them when a filter changes', () => {
    mockUseListKi.mockReturnValue(otherResult({ kis: rows(50, 'zeta'), total: 120 }));
    const { result } = renderPanelHook();

    act(() => {
      result.current.showMore('type:faq', 10);
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: { faq: 60 } }));

    act(() => {
      result.current.showMore('type:faq', 90);
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: { faq: 100 } }));

    act(() => {
      result.current.onToggleTile(tile(result, 'other'));
    });
    act(() => {
      result.current.showMore('other', 50);
    });
    expect(otherQuery()).toEqual(expect.objectContaining({ size: 100 }));

    act(() => {
      result.current.onStatusFilterChange('deleted');
    });
    expect(byTypeQuery()).toEqual(expect.objectContaining({ sizesByType: {} }));
    expect(otherQuery()).toEqual(expect.objectContaining({ size: 50 }));
    expect(groupsQuery()).toEqual(expect.objectContaining({ status: ['deleted'] }));
  });

  it('ignores a selected type that is no tile any more, and brings it back later', () => {
    const { result, rerender } = renderPanelHook();
    act(() => {
      result.current.onToggleTile(tile(result, 'type:playbook'));
    });
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:playbook']);

    mockUseListKiGroups.mockReturnValue(groupsResult({ groups: [GROUPS[0]] }));
    rerender();
    expect(result.current.selection.types.size).toBe(0);
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:faq']);

    mockUseListKiGroups.mockReturnValue(groupsResult());
    rerender();
    expect(result.current.groups.map(({ key }) => key)).toEqual(['type:playbook']);
  });

  it('shows "Other" by default when no document has a type', () => {
    mockUseListKiGroups.mockReturnValue(groupsResult({ groups: [], total: 4, totalOther: 4 }));
    mockUseListKi.mockReturnValue(otherResult({ kis: [ki('a'), ki('b')], total: 4 }));
    const { result } = renderPanelHook();
    expect(otherQuery()).toEqual(expect.objectContaining({ enabled: true, excludeTypes: [] }));
    expect(result.current.groups.map(({ key }) => key)).toEqual(['other']);
  });

  it('opens the first visible row when a tile hides the open document', () => {
    const { result, history } = renderPanelHook(
      '/ai_index/sample-ki/knowledge_documents/ai-index-idx-sample-ki?doc=faq-3'
    );
    act(() => {
      result.current.onToggleTile(tile(result, 'type:playbook'));
    });
    expect(history.location.search).toBe('?doc=playbook-0');
  });

  it('keeps a deep-linked document that is not in the visible list', () => {
    const { history } = renderPanelHook(
      '/ai_index/sample-ki/knowledge_documents/ai-index-idx-sample-ki?doc=other-doc'
    );
    expect(history.location.search).toBe('?doc=other-doc');
  });

  it('reports active filters; a second tile click deselects, Clear filters clears everything', () => {
    const { result } = renderPanelHook();
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.onToggleTile(tile(result, 'type:faq'));
    });
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => {
      result.current.onToggleTile(tile(result, 'type:faq'));
    });
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.onToggleTile(tile(result, 'type:faq'));
      result.current.onStatusFilterChange('all');
      result.current.onSortChange('title');
      result.current.onSearchTextChange('refund');
      result.current.onSearchSubmit('refund');
    });
    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchText).toBe('');
    expect(result.current.statusFilter).toBe('active');
    expect(result.current.selection.types.size).toBe(0);
    expect(result.current.sort).toBe('title');
  });
});
