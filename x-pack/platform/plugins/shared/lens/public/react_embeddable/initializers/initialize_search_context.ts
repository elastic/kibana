/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type {
  ProjectRoutingOverrides,
  PublishesProjectRoutingOverrides,
  PublishesUnifiedSearch,
  StateComparators,
} from '@kbn/presentation-publishing';
import { initializeTimeRangeManager, timeRangeComparators } from '@kbn/presentation-publishing';
import type { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import type { Observable } from 'rxjs';
import { BehaviorSubject, merge, map, distinctUntilChanged } from 'rxjs';
import { isEqual } from 'lodash';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import type { LensInternalApi, LensRuntimeState, LensUnifiedSearchContext } from '@kbn/lens-common';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import type { LensEmbeddableStartServices } from '../types';

export const searchContextComparators: StateComparators<LensUnifiedSearchContext> = {
  ...timeRangeComparators,
  query: 'skip',
  filters: 'skip',
  timeslice: 'skip',
  searchSessionId: 'skip',
  lastReloadRequestTime: 'skip',
};

export interface SearchContextConfig {
  api: PublishesUnifiedSearch & PublishesSearchSession & PublishesProjectRoutingOverrides;
  anyStateChange$: Observable<void>;
  cleanup: () => void;
  getLatestState: () => LensUnifiedSearchContext;
  reinitializeState: (lastSaved?: LensSerializedAPIConfig) => void;
}

const getProjectRoutingOverrides = (query: Query | AggregateQuery | undefined) => {
  if (isOfAggregateQueryType(query)) {
    const value = getProjectRoutingFromEsqlQuery(query.esql);
    return value ? [{ value }] : undefined;
  }
};

export function initializeSearchContext(
  initialState: LensRuntimeState,
  internalApi: LensInternalApi,
  parentApi: unknown,
  { injectFilterReferences }: LensEmbeddableStartServices
): SearchContextConfig {
  const searchSessionId$ = apiPublishesSearchSession(parentApi)
    ? parentApi.searchSessionId$
    : new BehaviorSubject<string | undefined>(undefined);

  const attributes = internalApi.attributes$.getValue();

  const lastReloadRequestTime$ = new BehaviorSubject<number | undefined>(undefined);

  // Make sure the panel access the filters with the correct references
  const filters$ = new BehaviorSubject<Filter[] | undefined>(
    injectFilterReferences(attributes.state.filters, attributes.references)
  );

  const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(attributes.state.query);

  const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);

  const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(
    getProjectRoutingOverrides(attributes.state.query)
  );

  const timeRangeManager = initializeTimeRangeManager(initialState);

  const subscriptions = [
    internalApi.attributes$
      .pipe(
        map((attrs) => attrs.state.query),
        distinctUntilChanged(isEqual)
      )
      .subscribe(query$),
    internalApi.attributes$
      .pipe(
        map((attrs) => attrs.state.filters),
        distinctUntilChanged(isEqual)
      )
      .subscribe(filters$),
    query$
      .pipe(map(getProjectRoutingOverrides), distinctUntilChanged(isEqual))
      .subscribe(projectRoutingOverrides$),
  ];

  return {
    api: {
      searchSessionId$,
      filters$,
      query$,
      timeslice$,
      projectRoutingOverrides$,
      isCompatibleWithUnifiedSearch: () => true,
      ...timeRangeManager.api,
    },
    anyStateChange$: merge(timeRangeManager.anyStateChange$),
    cleanup: () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    },
    getLatestState: () => ({
      searchSessionId: searchSessionId$.getValue(),
      filters: filters$.getValue(),
      query: query$.getValue(),
      timeslice: timeslice$.getValue(),
      lastReloadRequestTime: lastReloadRequestTime$.getValue(),
      ...timeRangeManager.getLatestState(),
    }),
    reinitializeState: (lastSaved?: LensSerializedAPIConfig) => {
      timeRangeManager.reinitializeState(lastSaved);
    },
  };
}
