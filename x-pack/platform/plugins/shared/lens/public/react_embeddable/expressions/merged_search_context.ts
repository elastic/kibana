/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart, FilterManager } from '@kbn/data-plugin/public';
import {
  type AggregateQuery,
  type Filter,
  isOfAggregateQueryType,
  type Query,
  type TimeRange,
  ExecutionContextSearch,
} from '@kbn/es-query';
import { PublishingSubject, apiPublishesTimeslice } from '@kbn/presentation-publishing';
import type { LensRuntimeState } from '../types';
import { nonNullable } from '../../utils';

export interface MergedSearchContext {
  now: number;
  timeRange: TimeRange | undefined;
  query: Array<Query | AggregateQuery>;
  filters: Filter[];
  disableWarningToasts: boolean;
}

export function getMergedSearchContext(
  { attributes }: LensRuntimeState,
  {
    filters,
    query,
    timeRange,
  }: {
    filters?: Filter[];
    query?: Query | AggregateQuery;
    timeRange?: TimeRange;
  },
  customTimeRange$: PublishingSubject<TimeRange | undefined>,
  parentApi: unknown,
  {
    data,
    injectFilterReferences,
  }: { data: DataPublicPluginStart; injectFilterReferences: FilterManager['inject'] }
): MergedSearchContext {
  const parentTimeSlice = apiPublishesTimeslice(parentApi)
    ? parentApi.timeslice$.getValue()
    : undefined;

  const timesliceTimeRange = parentTimeSlice
    ? {
        from: new Date(parentTimeSlice[0]).toISOString(),
        to: new Date(parentTimeSlice[1]).toISOString(),
        mode: 'absolute' as 'absolute',
      }
    : undefined;

  const customTimeRange = customTimeRange$.getValue();

  const timeRangeToRender = customTimeRange ?? timesliceTimeRange ?? timeRange;
  const context = {
    now: data.nowProvider.get().getTime(),
    timeRange: timeRangeToRender,
    query: [attributes.state.query].filter(nonNullable),
    filters: injectFilterReferences(attributes.state.filters || [], attributes.references),
    disableWarningToasts: true,
  };
  // Prepend query and filters from dashboard to the visualization ones
  if (query) {
    if (!isOfAggregateQueryType(query)) {
      context.query.unshift(query);
    }
  }
  if (filters) {
    context.filters.unshift(...filters.filter(({ meta }) => !meta.disabled));
  }
  return context;
}

export function getExecutionSearchContext(
  searchContext: MergedSearchContext
): ExecutionContextSearch {
  if (!isOfAggregateQueryType(searchContext.query[0])) {
    return searchContext as ExecutionContextSearch;
  }
  return {
    ...searchContext,
    query: [],
  };
}
