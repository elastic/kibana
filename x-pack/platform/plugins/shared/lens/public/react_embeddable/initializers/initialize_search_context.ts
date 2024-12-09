/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, Query, AggregateQuery } from '@kbn/es-query';
import {
  PublishesUnifiedSearch,
  StateComparators,
  getUnchangingComparator,
  initializeTimeRange,
} from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import {
  PublishesSearchSession,
  apiPublishesSearchSession,
} from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { buildObservableVariable } from '../helper';
import { LensInternalApi, LensRuntimeState, LensUnifiedSearchContext } from '../types';

export function initializeSearchContext(
  initialState: LensRuntimeState,
  internalApi: LensInternalApi,
  parentApi: unknown
): {
  api: PublishesUnifiedSearch & PublishesSearchSession;
  comparators: StateComparators<LensUnifiedSearchContext>;
  serialize: () => LensUnifiedSearchContext;
  cleanup: () => void;
} {
  const [searchSessionId$] = buildObservableVariable<string | undefined>(
    apiPublishesSearchSession(parentApi) ? parentApi.searchSessionId$ : undefined
  );

  const attributes = internalApi.attributes$.getValue();

  const [lastReloadRequestTime] = buildObservableVariable<number | undefined>(undefined);

  const [filters$] = buildObservableVariable<Filter[] | undefined>(attributes.state.filters);

  const [query$] = buildObservableVariable<Query | AggregateQuery | undefined>(
    attributes.state.query
  );

  const [timeslice$] = buildObservableVariable<[number, number] | undefined>(undefined);

  const timeRange = initializeTimeRange(initialState);
  return {
    api: {
      searchSessionId$,
      filters$,
      query$,
      timeslice$,
      isCompatibleWithUnifiedSearch: () => true,
      ...timeRange.api,
    },
    comparators: {
      query: getUnchangingComparator<LensUnifiedSearchContext, 'query'>(),
      filters: getUnchangingComparator<LensUnifiedSearchContext, 'filters'>(),
      timeslice: getUnchangingComparator<LensUnifiedSearchContext, 'timeslice'>(),
      searchSessionId: getUnchangingComparator<LensUnifiedSearchContext, 'searchSessionId'>(),
      lastReloadRequestTime: getUnchangingComparator<
        LensUnifiedSearchContext,
        'lastReloadRequestTime'
      >(),
      ...timeRange.comparators,
    },
    cleanup: noop,
    serialize: () => ({
      searchSessionId: searchSessionId$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
      timeslice: timeslice$.getValue(),
      lastReloadRequestTime: lastReloadRequestTime.getValue(),
      ...timeRange.serialize(),
    }),
  };
}
