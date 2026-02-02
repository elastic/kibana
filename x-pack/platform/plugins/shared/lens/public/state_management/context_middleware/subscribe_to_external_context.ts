/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { delay, finalize, switchMap, tap } from 'rxjs';
import { debounce, isEqual } from 'lodash';
import { waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';
import type { ProjectRouting } from '@kbn/es-query';
import type { LensAppServices } from '@kbn/lens-common';
import type { LensGetState, LensDispatch } from '..';
import { setState, setExecutionContext } from '..';
import { getResolvedDateRange } from '../../utils';

/**
 * subscribes to external changes for filters, searchSessionId, timerange, autorefresh and projectRouting
 */
export function subscribeToExternalContext(
  { data, cps }: LensAppServices,
  getState: LensGetState,
  dispatch: LensDispatch
) {
  const { query: queryService, search } = data;
  const { filterManager } = queryService;
  const dispatchFromExternal = (searchSessionId = search.session.start()) => {
    const globalFilters = filterManager.getFilters();
    const filters = isEqual(getState().lens.filters, globalFilters)
      ? null
      : { filters: globalFilters };

    dispatch(
      setExecutionContext({
        searchSessionId,
        ...filters,
        resolvedDateRange: getResolvedDateRange(queryService.timefilter.timefilter),
      })
    );
  };

  const debounceDispatchFromExternal = debounce(dispatchFromExternal, 100);

  const sessionSubscription = search.session
    .getSession$()
    // wait for a tick to filter/timerange subscribers the chance to update the session id in the state
    .pipe(delay(0))
    // then update if it didn't get updated yet
    .subscribe((newSessionId?: string) => {
      if (newSessionId && getState().lens.searchSessionId !== newSessionId) {
        debounceDispatchFromExternal(newSessionId);
      }
    });

  const filterSubscription = filterManager.getUpdates$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
    },
  });

  const timeSubscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe({
    next: () => {
      debounceDispatchFromExternal();
    },
  });

  const autoRefreshSubscription = data.query.timefilter.timefilter
    .getAutoRefreshFetch$()
    .pipe(
      tap(() => {
        debounceDispatchFromExternal();
      }),
      switchMap((done) =>
        // best way in lens to estimate that all panels are updated is to rely on search session service state
        waitUntilNextSessionCompletes$(search.session).pipe(finalize(done))
      )
    )
    .subscribe();

  // Subscribe to CPS projectRouting changes
  const cpsProjectRoutingSubscription = cps?.cpsManager
    ?.getProjectRouting$()
    .subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      const currentProjectRouting = getState().lens.projectRouting;

      if (cpsProjectRouting !== currentProjectRouting) {
        dispatch(setState({ projectRouting: cpsProjectRouting }));
      }
    });

  return () => {
    filterSubscription.unsubscribe();
    timeSubscription.unsubscribe();
    autoRefreshSubscription.unsubscribe();
    sessionSubscription.unsubscribe();
    cpsProjectRoutingSubscription?.unsubscribe();
  };
}
