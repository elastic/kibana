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
  initializeTimeRangeManager,
  timeRangeComparators,
} from '@kbn/presentation-publishing';
import {
  PublishesSearchSession,
  apiPublishesSearchSession,
} from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { BehaviorSubject, Observable, merge, map, distinctUntilChanged } from 'rxjs';
import { isEqual } from 'lodash';
import {
  LensEmbeddableStartServices,
  LensInternalApi,
  LensRuntimeState,
  LensSerializedState,
  LensUnifiedSearchContext,
} from '../types';

export const searchContextComparators: StateComparators<LensUnifiedSearchContext> = {
  ...timeRangeComparators,
  query: 'skip',
  filters: 'skip',
  timeslice: 'skip',
  searchSessionId: 'skip',
  lastReloadRequestTime: 'skip',
};

export interface SearchContextConfig {
  api: PublishesUnifiedSearch & PublishesSearchSession;
  anyStateChange$: Observable<void>;
  cleanup: () => void;
  getLatestState: () => LensUnifiedSearchContext;
  reinitializeState: (lastSaved?: LensSerializedState) => void;
}

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
  ];

  return {
    api: {
      searchSessionId$,
      filters$,
      query$,
      timeslice$,
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
    reinitializeState: (lastSaved?: LensSerializedState) => {
      timeRangeManager.reinitializeState(lastSaved);
    },
  };
}
