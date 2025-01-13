/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { PublishesWritableUnifiedSearch } from '@kbn/presentation-publishing';
import type { HasSerializedChildState } from '@kbn/presentation-containers';
import React, { useEffect, useMemo, useRef, type FC } from 'react';
import { BehaviorSubject } from 'rxjs';
import type {
  AnomalySwimLaneEmbeddableApi,
  AnomalySwimlaneEmbeddableCustomInput,
  AnomalySwimLaneEmbeddableState,
} from '../embeddables';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables';

export interface AnomalySwimLaneProps extends AnomalySwimlaneEmbeddableCustomInput {
  id?: string;
  executionContext: KibanaExecutionContext;
}

export const AnomalySwimLane: FC<AnomalySwimLaneProps> = ({
  id,
  jobIds,
  swimlaneType,
  viewBy,
  timeRange,
  filters,
  query,
  refreshConfig,
  perPage,
  executionContext,
}) => {
  const embeddableApi = useRef<AnomalySwimLaneEmbeddableApi>();

  const rawState: AnomalySwimLaneEmbeddableState = useMemo(() => {
    return {
      jobIds,
      swimlaneType,
      refreshConfig,
      viewBy,
      timeRange,
    };
  }, [jobIds, refreshConfig, swimlaneType, viewBy, timeRange]);

  useEffect(
    function syncState() {
      if (!embeddableApi.current) return;

      embeddableApi.current.updateUserInput({
        jobIds,
        swimlaneType,
        viewBy,
      });
    },
    [jobIds, swimlaneType, viewBy]
  );

  useEffect(
    function syncPagination() {
      if (!embeddableApi.current) return;
      embeddableApi.current.updatePagination({
        perPage,
        fromPage: 1,
      });
    },
    [perPage]
  );

  const parentApi = useMemo<
    PublishesWritableUnifiedSearch & {
      executionContext: KibanaExecutionContext;
    } & HasSerializedChildState<AnomalySwimLaneEmbeddableState>
  >(() => {
    const filters$ = new BehaviorSubject<Filter[] | undefined>(filters);
    const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(query);
    const timeRange$ = new BehaviorSubject<TimeRange | undefined>(timeRange);

    return {
      getSerializedStateForChild: () => ({ rawState }),
      filters$,
      setFilters: (newFilters) => {
        filters$.next(newFilters);
      },
      query$,
      setQuery: (newQuery) => {
        query$.next(newQuery);
      },
      timeRange$,
      setTimeRange: (newTimeRange) => {
        timeRange$.next(newTimeRange);
      },
      executionContext,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    function syncTimeRange() {
      parentApi.setTimeRange(timeRange);
    },
    [timeRange, parentApi]
  );

  useEffect(
    function syncUnifiedSearch() {
      parentApi.setFilters(filters);
      parentApi.setQuery(query);
    },
    [filters, query, parentApi]
  );

  return (
    <ReactEmbeddableRenderer<
      AnomalySwimLaneEmbeddableState,
      AnomalySwimLaneEmbeddableState,
      AnomalySwimLaneEmbeddableApi
    >
      maybeId={id}
      type={ANOMALY_SWIMLANE_EMBEDDABLE_TYPE}
      getParentApi={() => parentApi}
      onApiAvailable={(api) => {
        embeddableApi.current = api;
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default AnomalySwimLane;
