/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  catchError,
  timeout,
  mergeMap,
  last,
  map,
  toArray,
  of,
  from,
  type Observable,
  lastValueFrom,
} from 'rxjs';
import { MAX_CONCURRENT_REQUESTS } from '../../constants/index_data_visualizer_viewer';

export const fetchDataWithTimeout = async <T extends Promise<unknown>>(
  asyncFunc: T,
  abortCtrl: AbortController,
  defaultResult = null,
  timeoutDuration = 6000
) => {
  return await lastValueFrom(
    from(asyncFunc).pipe(
      timeout(timeoutDuration),
      catchError((error) => {
        // eslint-disable-next-line no-console
        console.error('Error occured in fetchDataWithTimeout', error);
        abortCtrl.abort();
        return of(defaultResult);
      })
    )
  );
};
/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export function rateLimitingForkJoin<T>(
  observables: Array<Observable<T>>,
  maxConcurrentRequests = MAX_CONCURRENT_REQUESTS
): Observable<T[]> {
  return from(observables).pipe(
    mergeMap(
      (observable, index) =>
        observable.pipe(
          last(),
          map((value) => ({ index, value }))
        ),
      maxConcurrentRequests
    ),
    toArray(),
    map((indexedObservables) =>
      indexedObservables.sort((l, r) => l.index - r.index).map((obs) => obs.value)
    )
  );
}
