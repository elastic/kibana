/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, bufferTime, concatMap, filter, share, scan } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { INTERNAL_API_BASE_PATH } from '../../../../../../common/constants';

export const docCountApi = (httpSetup: HttpSetup) => {
  const subj = new Subject<string>();
  const abortController = new AbortController();

  const observable = subj.pipe(
    // Buffer indices for 100ms before making a request
    bufferTime(100),
    filter((indices) => indices.length > 0),
    concatMap((indices) =>
      httpSetup.post<Record<string, number>>(`${INTERNAL_API_BASE_PATH}/index_doc_count`, {
        body: JSON.stringify({ indexNames: indices }),
        signal: abortController.signal,
      })
    ),
    scan((acc, response) => ({ ...acc, ...response }), {} as Record<string, number>),
    share()
  );

  return {
    getByName: (index: string) => subj.next(index),
    getObservable: () => observable,
    abort: () => abortController.abort(),
  };
};
