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

  const initialState = readEpisodesListAppStateFromUrlStorage(urlStateStorage);

  const [filterState, setFilterStateInternal] = useState<EpisodesFilterState>(
    () => initialState.filterState
  );
  const [histogramBreakdownField, setHistogramBreakdownFieldInternal] = useState<
    string | undefined
  >(() => initialState.histogramBreakdownField);

  const filterRef = useRef(filterState);
  filterRef.current = filterState;
  const histogramBreakdownRef = useRef(histogramBreakdownField);
  histogramBreakdownRef.current = histogramBreakdownField;

  useEffect(() => {
    /**
     * useState above only reads the URL on mount and filter/time updates from the user go through
     * setFilterState / handleTimeChange / setHistogramBreakdownField.
     *
     * When `location.search` changes without those (e.g. browser Back/Forward), we must re-apply
     * the state here or the UI will diverge from the address bar.
     **/
    const {
      filterState: fromUrl,
      timeRange: urlTime,
      histogramBreakdownField: histBreakdownFromUrl,
    } = readEpisodesListAppStateFromUrlStorage(urlStateStorage);
    setFilterStateInternal((prev) => (deepEqual(prev, fromUrl) ? prev : fromUrl));
    setHistogramBreakdownFieldInternal((prev) =>
      prev === histBreakdownFromUrl ? prev : histBreakdownFromUrl
    );
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
        if (!deepEqual(next, prev)) {
          const tr = timefilter.getTime() ?? DEFAULT_EPISODES_LIST_TIME_RANGE;
          void writeEpisodesListAppStateToUrlStorage(
            urlStateStorage,
            next,
            tr,
            histogramBreakdownRef.current
          );
        }
        return next;
      });
    },
    [urlStateStorage, timefilter]
  );

  const handleTimeChange = useCallback(
    (range: TimeRange) => {
      setTimeOnFilter(range);
      void writeEpisodesListAppStateToUrlStorage(
        urlStateStorage,
        filterRef.current,
        range,
        histogramBreakdownRef.current
      );
    },
    [setTimeOnFilter, urlStateStorage]
  );

  const setHistogramBreakdownField = useCallback(
    (field: string | undefined) => {
      setHistogramBreakdownFieldInternal(field);
      const tr = timefilter.getTime() ?? DEFAULT_EPISODES_LIST_TIME_RANGE;
      void writeEpisodesListAppStateToUrlStorage(urlStateStorage, filterRef.current, tr, field);
    },
    [urlStateStorage, timefilter]
  );

  return {
    filterState,
    setFilterState,
    timeRange,
    handleTimeChange,
    histogramBreakdownField,
    setHistogramBreakdownField,
  };
}
