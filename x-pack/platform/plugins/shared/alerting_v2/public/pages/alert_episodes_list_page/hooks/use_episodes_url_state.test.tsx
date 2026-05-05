/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { encode as encodeRison } from '@kbn/rison';
import { useEpisodesUrlState } from './use_episodes_url_state';

jest.mock('@kbn/data-plugin/public', () => ({
  syncQueryStateWithUrl: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

const fakeData = { query: {} } as unknown as Parameters<typeof useEpisodesUrlState>[0]['data'];

const wrapWith =
  (history: ReturnType<typeof createMemoryHistory>): React.FC<{ children: React.ReactNode }> =>
  ({ children }) =>
    <Router history={history}>{children}</Router>;

describe('useEpisodesUrlState', () => {
  it('hydrates filterState from the `_a` query param on mount', () => {
    const a = encodeRison({ filters: { ruleId: 'rule-1', groupHash: 'gh-x' } });
    const history = createMemoryHistory({ initialEntries: [`/?_a=${a}`] });

    const { result } = renderHook(() => useEpisodesUrlState({ data: fakeData }), {
      wrapper: wrapWith(history),
    });

    expect(result.current.filterState).toEqual({ ruleId: 'rule-1', groupHash: 'gh-x' });
  });

  it('defaults to an empty filter state when no `_a` is in the URL', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { result } = renderHook(() => useEpisodesUrlState({ data: fakeData }), {
      wrapper: wrapWith(history),
    });

    expect(result.current.filterState).toEqual({});
  });

  it('writes filterState changes back to `_a` so URLs are shareable', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { result } = renderHook(() => useEpisodesUrlState({ data: fakeData }), {
      wrapper: wrapWith(history),
    });

    await act(async () => {
      result.current.setFilterState({ ruleId: 'rule-1', groupHash: 'gh-x' });
    });

    expect(history.location.search).toMatch(/_a=/);
    expect(decodeURIComponent(history.location.search)).toContain('ruleId:rule-1');
    expect(decodeURIComponent(history.location.search)).toContain('groupHash:gh-x');
  });
});
