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
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { EPISODES_LIST_APP_STATE_KEY } from '../utils/episodes_list_url_state';
import { useEpisodesListUrlState } from './use_episodes_list_url_state';

const createMockTimefilter = () => dataPluginMock.createStartContract().query.timefilter.timefilter;

describe('useEpisodesListUrlState', () => {
  it('gets filter state from _a episodesList in the URL', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const urlStateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    });
    const timefilter = createMockTimefilter();

    await act(async () => {
      await urlStateStorage.set(
        '_a',
        { [EPISODES_LIST_APP_STATE_KEY]: { status: 'active', ruleId: 'rule-123' } },
        { replace: true }
      );
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesListUrlState(timefilter), { wrapper });

    expect(result.current.filterState).toEqual({
      status: 'active',
      ruleId: 'rule-123',
    });
  });

  it('persists setFilterState to the URL', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const timefilter = createMockTimefilter();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Router history={history}>{children}</Router>
    );

    const { result } = renderHook(() => useEpisodesListUrlState(timefilter), { wrapper });

    await act(async () => {
      result.current.setFilterState({ status: 'recovering', ruleId: 'r9' });
    });

    expect(result.current.filterState).toEqual({ status: 'recovering', ruleId: 'r9' });
    expect(history.location.search).toBe(
      '?_a=(episodesList:(ruleId:r9,status:recovering,timeFrom:now-15m,timeTo:now))'
    );
  });
});
