/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GlobalSearchBatchedResults,
  GlobalSearchResult,
} from '@kbn/global-search-plugin/public';
import { act, renderHook } from '@testing-library/react';
import { Subject, of } from 'rxjs';
import { useSearchState } from './use_search_state';

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

jest.mock('../suggestions', () => ({
  getSuggestions: jest.fn(() => []),
}));

jest.mock('../lib', () => ({
  resultToOption: jest.fn((r: { id: string; title: string; url: string; type: string }) => ({
    key: r.id,
    label: r.title,
    url: r.url,
    type: r.type,
  })),
  suggestionToOption: jest.fn((s: { suggestion: string }) => ({
    label: s.suggestion,
    type: '__suggestion__',
    suggestion: s.suggestion,
  })),
}));

jest.mock('../search_syntax', () => ({
  parseSearchParams: jest.fn((value: string) => ({
    term: value,
    filters: { types: [], tags: [] },
  })),
}));

type Result =
  | string
  | {
      id: string;
      type?: string;
      score?: number;
      categoryLabel?: string | null;
    };

const createResult = (result: Result): GlobalSearchResult => {
  const id = typeof result === 'string' ? result : result.id;
  const type = typeof result === 'string' ? 'application' : result.type ?? 'application';
  const score = typeof result === 'string' ? 42 : result.score ?? 42;

  const categoryLabel =
    typeof result === 'string'
      ? 'Kibana'
      : result.categoryLabel !== undefined
      ? result.categoryLabel
      : type === 'application'
      ? 'Kibana'
      : 'Test';

  return {
    id,
    type,
    title: id,
    url: `/app/test/${id}`,
    score,
    meta: { categoryLabel },
  };
};

const createBatch = (...results: Result[]): GlobalSearchBatchedResults => ({
  results: results.map(createResult),
});

describe('useSearchState', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const makeDeps = (overrides?: { searchCharLimit?: number }) => {
    const globalSearch = {
      searchCharLimit: overrides?.searchCharLimit ?? 1000,
      getSearchableTypes: jest.fn().mockResolvedValue(['application', 'test']),
      find: jest.fn().mockReturnValue(of(createBatch())),
    } as any;

    const navigateToUrl = jest.fn();
    const reportEvent = {
      searchRequest: jest.fn(),
      navigateToApplication: jest.fn(),
      navigateToSavedObject: jest.fn(),
    } as any;

    return { globalSearch, navigateToUrl, reportEvent };
  };

  const triggerInitialLoadAndRunDebounce = async (result: { current: any }) => {
    act(() => {
      result.current.triggerInitialLoad();
    });

    // allow getSearchableTypes async effect to resolve
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });
  };

  it('displays an error state and does not search again when the search input exceeds the specified char limit', async () => {
    const { globalSearch, navigateToUrl, reportEvent } = makeDeps({ searchCharLimit: 1 });

    const { result } = renderHook(() =>
      useSearchState({
        globalSearch,
        navigateToUrl,
        reportEvent,
      })
    );

    // Initial load triggers the first (empty) search
    await triggerInitialLoadAndRunDebounce(result);

    expect(globalSearch.find).toHaveBeenCalledTimes(1);

    // Exceed the limit
    act(() => {
      result.current.setSearchValue('aaa');
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(result.current.searchCharLimitExceeded).toBe(true);
    expect(globalSearch.find).toHaveBeenCalledTimes(1); // no additional search calls
  });

  it('correctly filters and sorts results by title when the search value is empty', async () => {
    const { globalSearch, navigateToUrl, reportEvent } = makeDeps();

    globalSearch.find.mockReturnValueOnce(
      of(createBatch('Discover', 'Canvas'), createBatch({ id: 'Visualize', type: 'test' }, 'Graph'))
    );

    const { result } = renderHook(() =>
      useSearchState({
        globalSearch,
        navigateToUrl,
        reportEvent,
      })
    );

    await triggerInitialLoadAndRunDebounce(result);

    const labels = result.current.options.map((o: any) => o.label);
    expect(labels).toEqual(['Canvas', 'Discover', 'Graph']); // Visualize (type=test) filtered out
  });

  it('search term triggers searchRequest and sorts results by score (descending)', async () => {
    const { globalSearch, navigateToUrl, reportEvent } = makeDeps();

    // first call = initial empty load
    globalSearch.find.mockReturnValueOnce(of(createBatch('Discover')));

    // second call = user typed search
    globalSearch.find.mockReturnValueOnce(
      of(
        createBatch(
          { id: 'Lowest score', type: 'application', score: 1 },
          { id: 'Highest score', type: 'application', score: 100 }
        )
      )
    );

    const { result } = renderHook(() =>
      useSearchState({
        globalSearch,
        navigateToUrl,
        reportEvent,
      })
    );

    await triggerInitialLoadAndRunDebounce(result);

    act(() => {
      result.current.setSearchValue('d');
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(reportEvent.searchRequest).toHaveBeenCalledTimes(1);

    const labels = result.current.options.map((o: any) => o.label);
    expect(labels).toEqual(['Highest score', 'Lowest score']);
  });

  it('only displays results from the last search', async () => {
    const { globalSearch, navigateToUrl, reportEvent } = makeDeps();

    const firstSearch$ = new Subject<GlobalSearchBatchedResults>();

    // first call = initial empty load
    globalSearch.find.mockReturnValueOnce(firstSearch$);

    // second call = user typed search
    globalSearch.find.mockReturnValueOnce(
      of(
        createBatch(
          { id: 'Visualize', type: 'application', score: 10 },
          { id: 'Map', type: 'application', score: 20 }
        )
      )
    );

    const { result } = renderHook(() =>
      useSearchState({
        globalSearch,
        navigateToUrl,
        reportEvent,
      })
    );

    await triggerInitialLoadAndRunDebounce(result);
    expect(globalSearch.find).toHaveBeenCalledTimes(1);

    // New query -> should cancel previous subscription + set new results
    act(() => {
      result.current.setSearchValue('d');
    });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(globalSearch.find).toHaveBeenCalledTimes(2);

    const lastLabels = result.current.options.map((o: any) => o.label);
    expect(lastLabels).toEqual(['Map', 'Visualize']);

    // Late emission from first search should NOT override
    act(() => {
      firstSearch$.next(createBatch('Discover', 'Canvas'));
      firstSearch$.complete();
    });

    const labelsAfterLateEmit = result.current.options.map((o: any) => o.label);
    expect(labelsAfterLateEmit).toEqual(['Map', 'Visualize']);
  });
});
