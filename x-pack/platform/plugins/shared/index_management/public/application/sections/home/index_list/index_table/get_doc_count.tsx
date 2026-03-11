/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY,
  Subject,
  bufferTime,
  catchError,
  concatMap,
  filter,
  from,
  map,
  of,
  scan,
  share,
} from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { INTERNAL_API_BASE_PATH } from '../../../../../../common/constants';

export type DocCountResult =
  | { status: RequestResultType.Success; count: number }
  | { status: RequestResultType.Error };

export enum RequestResultType {
  Success = 'success',
  Error = 'error',
}

export const docCountApi = (httpSetup: HttpSetup) => {
  const subj = new Subject<string>();
  const abortController = new AbortController();

  type RequestResult =
    | { type: RequestResultType.Success; indexNames: string[]; response: Record<string, number> }
    | { type: RequestResultType.Error; indexNames: string[] };

  const observable = subj.pipe(
    // Buffer indices for 100ms before making a request
    bufferTime(100),
    // filter out empty arrays
    filter((indices) => indices.length > 0),
    // make a request for each batch of indices
    concatMap((indexNames) =>
      from(
        httpSetup.post<Record<string, number>>(`${INTERNAL_API_BASE_PATH}/index_doc_count`, {
          body: JSON.stringify({ indexNames }),
          signal: abortController.signal,
        })
      ).pipe(
        map(
          (response): RequestResult => ({ type: RequestResultType.Success, indexNames, response })
        ),
        catchError(() => {
          // Avoid showing errors when navigating away; IndexTable aborts in componentWillUnmount.
          if (abortController.signal.aborted) {
            return EMPTY;
          }
          return of<RequestResult>({ type: RequestResultType.Error, indexNames });
        })
      )
    ),
    // combine all the responses into a single object (but keep per-index error state)
    scan((acc, result): Record<string, DocCountResult> => {
      const next = { ...acc };

      if (result.type === RequestResultType.Error) {
        // If the request fails, mark only indices in that request as errored.
        for (const indexName of result.indexNames) {
          next[indexName] = next[indexName] || { status: RequestResultType.Error };
        }
        return next;
      } else {
        for (const indexName of result.indexNames) {
          next[indexName] = {
            status: RequestResultType.Success,
            count: result.response[indexName] ?? 0,
          };
        }

        return next;
      }
    }, {} as Record<string, DocCountResult>),
    // share the observable so it can be used multiple times
    share()
  );

  return {
    getByName: (index: string) => subj.next(index),
    getObservable: () => observable,
    abort: () => abortController.abort(),
  };
};
