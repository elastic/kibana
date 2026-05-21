/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepEqual from 'fast-deep-equal';
import {
  DEFAULT_EPISODES_LIST_TIME_RANGE,
  readEpisodesListAppStateFromUrlStorage,
  writeEpisodesListAppStateToUrlStorage,
} from '../utils/episodes_list_url_state';
import { useEpisodesTimeRange } from './use_episodes_time_range';

export function useEpisodesListUrlState(timefilter: TimefilterContract) {
  const history = useHistory();
  const location = useLocation();
  const { timeRange, handleTimeChange: setTimeOnFilter } = useEpisodesTimeRange(timefilter);

  const urlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: false,
        useHashQuery: false,
      }),
    [history]
  );

  const [filterState, setFilterStateInternal] = useState<EpisodesFilterState>(
    () => readEpisodesListAppStateFromUrlStorage(urlStateStorage).filterState
  );

  const filterRef = useRef(filterState);
  filterRef.current = filterState;

  useEffect(() => {
    /**
     * useState above only reads the URL on mount and filter/time updates from the user go through
     * setFilterState / handleTimeChange.
     *
     * When `location.search` changes without those (e.g. browser Back/Forward), we must re-apply
     * the state here or the UI will diverge from the address bar.
     **/
    const { filterState: fromUrl, timeRange: urlTime } =
      readEpisodesListAppStateFromUrlStorage(urlStateStorage);
    setFilterStateInternal((prev) => (deepEqual(prev, fromUrl) ? prev : fromUrl));
    if (urlTime) {
      timefilter.setTime(urlTime);
    }
  }, [location.search, urlStateStorage, timefilter]);

  const setFilterState = useCallback(
    (update: SetStateAction<EpisodesFilterState>) => {
      setFilterStateInternal((prev) => {
        const next =
          typeof update === 'function'
            ? (update as (p: EpisodesFilterState) => EpisodesFilterState)(prev)
            : update;
        const tr = timefilter.getTime() ?? DEFAULT_EPISODES_LIST_TIME_RANGE;
        void writeEpisodesListAppStateToUrlStorage(urlStateStorage, next, tr);
        return next;
      });
    },
    [urlStateStorage, timefilter]
  );

  const handleTimeChange = useCallback(
    (range: TimeRange) => {
      setTimeOnFilter(range);
      void writeEpisodesListAppStateToUrlStorage(urlStateStorage, filterRef.current, range);
    },
    [setTimeOnFilter, urlStateStorage]
  );

  return {
    filterState,
    setFilterState,
    timeRange,
    handleTimeChange,
  };
}
