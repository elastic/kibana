/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  useV2RulesTabNewBadge,
  V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY,
} from './use_v2_rules_tab_new_badge';

describe('useV2RulesTabNewBadge', () => {
  beforeEach(() => {
    localStorage.removeItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY);
  });

  it('returns a primary new-dot badge when Universal has not been visited', () => {
    const { result } = renderHook(() => useV2RulesTabNewBadge(false));

    expect(result.current).toEqual({
      iconType: 'dot',
      color: 'primary',
      tooltip: 'New',
    });
  });

  it('keeps the badge while Universal stays selected', () => {
    const { result, rerender } = renderHook(({ isSelected }) => useV2RulesTabNewBadge(isSelected), {
      initialProps: { isSelected: true },
    });

    expect(result.current).toBeDefined();
    rerender({ isSelected: true });
    expect(result.current).toBeDefined();
    expect(localStorage.getItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY)).toBeNull();
  });

  it('clears the badge after leaving Universal and persists across remount', () => {
    const { result, rerender } = renderHook(({ isSelected }) => useV2RulesTabNewBadge(isSelected), {
      initialProps: { isSelected: true },
    });

    expect(result.current).toBeDefined();

    rerender({ isSelected: false });
    expect(result.current).toBeUndefined();
    expect(localStorage.getItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY)).toBe(
      JSON.stringify(true)
    );

    const remounted = renderHook(() => useV2RulesTabNewBadge(false));
    expect(remounted.result.current).toBeUndefined();
  });

  it('marks visited on pagehide while Universal is selected', () => {
    const { result } = renderHook(() => useV2RulesTabNewBadge(true));

    expect(result.current).toBeDefined();
    window.dispatchEvent(new Event('pagehide'));

    expect(localStorage.getItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY)).toBe(
      JSON.stringify(true)
    );

    const remounted = renderHook(() => useV2RulesTabNewBadge(true));
    expect(remounted.result.current).toBeUndefined();
  });

  it('does not persist on list-header unmount by default (rule details stay in Universal)', () => {
    const { result, unmount } = renderHook(() => useV2RulesTabNewBadge(true));

    expect(result.current).toBeDefined();
    unmount();

    expect(localStorage.getItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY)).toBeNull();

    const remounted = renderHook(() => useV2RulesTabNewBadge(true));
    expect(remounted.result.current).toBeDefined();
  });

  it('marks visited after SPA app leave when persistOnUnmount is enabled', () => {
    const { result, unmount } = renderHook(() =>
      useV2RulesTabNewBadge(true, { persistOnUnmount: true })
    );

    expect(result.current).toBeDefined();
    unmount();

    expect(localStorage.getItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY)).toBe(
      JSON.stringify(true)
    );

    const remounted = renderHook(() => useV2RulesTabNewBadge(true));
    expect(remounted.result.current).toBeUndefined();
  });

  it('does not return a badge when already visited in localStorage', () => {
    localStorage.setItem(V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY, JSON.stringify(true));

    const { result } = renderHook(() => useV2RulesTabNewBadge(true));
    expect(result.current).toBeUndefined();
  });
});
