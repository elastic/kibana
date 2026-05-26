/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type {
  AnomalySwimLaneEmbeddableState,
  SwimlaneType,
} from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type {
  PublishesWritableUnifiedSearch,
  HasSerializedChildState,
} from '@kbn/presentation-publishing';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import React, { useEffect, useMemo, useRef, type FC } from 'react';
import { BehaviorSubject } from 'rxjs';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/anomaly_swimlane';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables';

export interface AnomalySwimLaneProps {
  id?: string;
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  viewBy?: string;
  timeRange?: TimeRange;
  perPage?: number;
  filters?: Filter[];
  query?: Query;
  executionContext: KibanaExecutionContext;
}

const buildEmbeddableState = ({
  jobIds,
  swimlaneType,
  viewBy,
  timeRange,
  perPage,
}: Pick<
  AnomalySwimLaneProps,
  'jobIds' | 'swimlaneType' | 'viewBy' | 'timeRange' | 'perPage'
>): AnomalySwimLaneEmbeddableState => {
  if (swimlaneType === 'viewBy' && viewBy) {
    return {
      job_ids: jobIds,
      swimlane_type: 'viewBy',
      view_by: viewBy,
      ...(timeRange ? { time_range: timeRange } : {}),
      ...(perPage !== undefined ? { per_page: perPage } : {}),
    };
  }

  return {
    job_ids: jobIds,
    swimlane_type: 'overall',
    ...(timeRange ? { time_range: timeRange } : {}),
    ...(perPage !== undefined ? { per_page: perPage } : {}),
  };
};

export const AnomalySwimLane: FC<AnomalySwimLaneProps> = ({
  id,
  jobIds,
  swimlaneType,
  viewBy,
  timeRange,
  filters,
  query,
  perPage,
  executionContext,
}) => {
  const embeddableApi = useRef<AnomalySwimLaneEmbeddableApi>();

  const embeddableState = useMemo(
    () => buildEmbeddableState({ jobIds, swimlaneType, viewBy, timeRange, perPage }),
    [jobIds, swimlaneType, viewBy, timeRange, perPage]
  );

  useEffect(
    function syncState() {
      if (!embeddableApi.current) return;
      embeddableApi.current.updateUserInput(
        swimlaneType === 'viewBy' && viewBy
          ? { job_ids: jobIds, swimlane_type: 'viewBy', view_by: viewBy }
          : { job_ids: jobIds, swimlane_type: 'overall' }
      );
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
      getSerializedStateForChild: () => embeddableState,
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
    <EmbeddableRenderer<AnomalySwimLaneEmbeddableState, AnomalySwimLaneEmbeddableApi>
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
