/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  type FC,
  type PropsWithChildren,
  createContext,
  useEffect,
  useState,
  useContext,
  useMemo,
} from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { type AggregateQuery } from '@kbn/es-query';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { getBoundsRoundedToInterval, useTimeBuckets } from '@kbn/ml-time-buckets';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import { useAiopsAppContext } from './use_aiops_app_context';
import { useReload } from './use_reload';

export const FilterQueryContext = createContext<{
  filters: Filter[];
  query: Query;
  timeRange: TimeRange;
  searchBounds: TimeRangeBounds;
  interval: string;
}>({
  get filters(): Filter[] {
    throw new Error('FilterQueryContext is not initialized');
  },
  get query(): Query {
    throw new Error('FilterQueryContext is not initialized');
  },
  get timeRange(): TimeRange {
    throw new Error('FilterQueryContext is not initialized');
  },
  get searchBounds(): TimeRangeBounds {
    throw new Error('FilterQueryContext is not initialized');
  },
  get interval(): string {
    throw new Error('FilterQueryContext is not initialized');
  },
});

/**
 * Helper context to provide the latest
 *   - filter
 *   - query
 *   - time range
 * from the data plugin.
 * Also merges custom filters and queries provided with an input.
 *
 * @param children
 * @constructor
 */
export const FilterQueryContextProvider: FC<
  PropsWithChildren<{
    timeRange?: TimeRange;
    filtersApi?: PublishesFilters;
  }>
> = ({ children, timeRange, filtersApi }) => {
  const {
    data: {
      query: { filterManager, queryString, timefilter },
    },
    uiSettings,
  } = useAiopsAppContext();

  const timeBuckets = useTimeBuckets(uiSettings);
  const reload = useReload();

  const [resultFilters, setResultFilter] = useState<Filter[]>(filterManager.getFilters());
  const [resultQuery, setResultQuery] = useState<Query | AggregateQuery>(queryString.getQuery());

  const timeRangeUpdates = useTimeRangeUpdates(false);

  useEffect(() => {
    // Embeddable API exposes not just filters from query bar, but also
    // filters from other dashboard controls
    // so if that information is available, we should prioritize it
    if (filtersApi?.filters$) {
      const sub = filtersApi?.filters$.subscribe(() => {
        setResultFilter(filtersApi?.filters$.getValue() ?? []);
      });
      return () => {
        sub.unsubscribe();
      };
    } else {
      const sub = filterManager.getUpdates$().subscribe(() => {
        setResultFilter(filterManager.getFilters());
      });
      return () => {
        sub.unsubscribe();
      };
    }
  }, [filterManager, filtersApi]);

  useEffect(() => {
    const sub = queryString.getUpdates$().subscribe(() => {
      setResultQuery(queryString.getQuery());
    });
    return () => {
      sub.unsubscribe();
    };
  }, [queryString]);

  const resultTimeRange = useMemo(() => {
    return timeRange ?? timeRangeUpdates;
  }, [timeRangeUpdates, timeRange]);

  /**
   * Search bounds derived from the time range.
   * Has to be updated on reload, in case relative time range is used.
   */
  const bounds = useMemo(() => {
    return timefilter.timefilter.calculateBounds(resultTimeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultTimeRange, timefilter, reload.refreshTimestamp]);

  const timeBucketsInterval = useMemo(() => {
    timeBuckets.setInterval('auto');
    timeBuckets.setBounds(bounds);
    return timeBuckets.getInterval();
  }, [bounds, timeBuckets]);

  /**
   * Search bounds rounded to the time buckets interval.
   */
  const searchBounds = useMemo(() => {
    return getBoundsRoundedToInterval(bounds, timeBucketsInterval, false);
  }, [bounds, timeBucketsInterval]);

  return (
    <FilterQueryContext.Provider
      value={{
        filters: resultFilters,
        query: resultQuery as Query,
        timeRange: resultTimeRange,
        searchBounds,
        interval: timeBucketsInterval.expression,
      }}
    >
      {children}
    </FilterQueryContext.Provider>
  );
};

export const useFilterQueryUpdates = () => {
  return useContext(FilterQueryContext);
};
