/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  createKbnUrlStateStorage,
  type IKbnUrlStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  EpisodesFilterState,
  EpisodesSortState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

const APP_STATE_STORAGE_KEY = '_a';

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

interface PersistedAppState {
  filters?: EpisodesFilterState;
  sort?: EpisodesSortState;
}

/**
 * Two-way URL state sync for the episodes list page.
 *
 * - `_a` carries the app-level filters and sort (rison-encoded).
 * - `_g` carries the global timefilter; managed by `syncQueryStateWithUrl`.
 *
 * The page hydrates `filterState` / `sortState` once from `_a` on mount, then
 * writes back on every change so any URL on the page is shareable.
 */
export const useEpisodesUrlState = ({ data }: { data: DataPublicPluginStart }) => {
  const history = useHistory();

  const stateStorage: IKbnUrlStateStorage = useMemo(
    () => createKbnUrlStateStorage({ useHash: false, useHashQuery: false, history }),
    [history]
  );

  const [filterState, setFilterState] = useState<EpisodesFilterState>(() => {
    const persisted = stateStorage.get<PersistedAppState>(APP_STATE_STORAGE_KEY);
    return persisted?.filters ?? {};
  });
  const [sortState, setSortState] = useState<EpisodesSortState>(() => {
    const persisted = stateStorage.get<PersistedAppState>(APP_STATE_STORAGE_KEY);
    return persisted?.sort ?? DEFAULT_SORT;
  });

  useEffect(() => {
    const { stop } = syncQueryStateWithUrl(data.query, stateStorage);
    return stop;
  }, [data.query, stateStorage]);

  const isFirstWrite = useRef(true);
  useEffect(() => {
    if (isFirstWrite.current) {
      isFirstWrite.current = false;
      return;
    }
    stateStorage.set<PersistedAppState>(
      APP_STATE_STORAGE_KEY,
      { filters: filterState, sort: sortState },
      { replace: true }
    );
  }, [stateStorage, filterState, sortState]);

  return { filterState, setFilterState, sortState, setSortState };
};
