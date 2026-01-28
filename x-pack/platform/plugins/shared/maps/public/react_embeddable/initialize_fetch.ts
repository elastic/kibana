/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, map, of } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import { apiHasParentApi, apiPublishesPauseFetch, fetch$ } from '@kbn/presentation-publishing';
import type { Query } from '@kbn/es-query';
import type { MapExtent } from '../../common/descriptor_types';
import { getSearchService } from '../kibana_services';
import type { MapStore } from '../reducers/store';
import type { MapApi } from './types';
import { setMapSettings, setQuery, setPauseSyncData } from '../actions';

function getIsRestore(searchSessionId?: string) {
  if (!searchSessionId) {
    return false;
  }
  const searchSessionOptions = getSearchService().session.getSearchOptions(searchSessionId);
  return searchSessionOptions ? searchSessionOptions.isRestore : false;
}

export function initializeFetch({
  api,
  controlledBy,
  getIsFilterByMapExtent,
  searchSessionMapBuffer,
  store,
}: {
  api: MapApi;
  controlledBy: string;
  getIsFilterByMapExtent: () => boolean;
  searchSessionMapBuffer?: MapExtent;
  store: MapStore;
}) {
  let prevIsRestore: boolean | undefined;
  const fetchSubscription = fetch$(api).subscribe((fetchContext: FetchContext) => {
    // New search session id causes all layers from elasticsearch to refetch data.
    // Dashboard provides a new search session id anytime filters change.
    // Thus, filtering embeddable container by map extent causes a new search session id any time the map is moved.
    // Disabling search session when filtering embeddable container by map extent.
    // The use case for search sessions (restoring results because of slow responses) does not match the use case of
    // filtering by map extent (rapid responses as users explore their map).
    const searchSessionId = getIsFilterByMapExtent() ? undefined : fetchContext.searchSessionId;
    const isRestore = getIsRestore(searchSessionId);

    // Map can not be interacted with when viewing session restore.
    // Session restore only show data for cached extent and new data can not be fetch
    if (isRestore !== prevIsRestore) {
      prevIsRestore = isRestore;
      store.dispatch(
        setMapSettings({
          disableInteractive: isRestore,
          hideToolbarOverlay: isRestore,
        })
      );
    }

    store.dispatch<any>(
      setQuery({
        filters: fetchContext.filters
          ? fetchContext.filters.filter(
              (filter) => !filter.meta.disabled && filter.meta.controlledBy !== controlledBy
            )
          : [],
        query: fetchContext.query as Query | undefined,
        timeFilters: fetchContext.timeRange,
        timeslice: fetchContext.timeslice
          ? { from: fetchContext.timeslice[0], to: fetchContext.timeslice[1] }
          : undefined,
        clearTimeslice: fetchContext.timeslice === undefined,
        forceRefresh: fetchContext.isReload,
        searchSessionId,
        searchSessionMapBuffer: isRestore ? searchSessionMapBuffer : undefined,
        projectRouting: fetchContext.projectRouting,
      })
    );
  });

  const parentPauseFetch =
    apiHasParentApi(api) && apiPublishesPauseFetch(api.parentApi)
      ? api.parentApi.isFetchPaused$
      : of(false);
  const apiPauseFetch = apiPublishesPauseFetch(api) ? api.isFetchPaused$ : of(false);
  const isPausedSubscription = combineLatest([parentPauseFetch, apiPauseFetch])
    .pipe(
      map(([parentPause, apiPause]) => {
        return parentPause || apiPause;
      })
    )
    .subscribe((isFetchPaused) => {
      store.dispatch<any>(setPauseSyncData(isFetchPaused));
    });

  return () => {
    fetchSubscription.unsubscribe();
    isPausedSubscription?.unsubscribe();
  };
}
