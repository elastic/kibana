/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { tap } from 'rxjs';
import type { RequestCancellationManager } from '@kbn/presentation-publishing';
import { useAiopsAppContext } from './use_aiops_app_context';

export function useCancellableSearch(requestCancellationManager?: RequestCancellationManager) {
  const { data } = useAiopsAppContext();
  const abortController = useRef(new AbortController());
  const [isLoading, setIsFetching] = useState<boolean>(false);

  const runRequest = useCallback(
    <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(
      requestBody: RequestBody
    ): Promise<ResponseType | null> => {
      return new Promise((resolve, reject) => {
        const signal = requestCancellationManager
          ? AbortSignal.any([abortController.current.signal, requestCancellationManager.signal])
          : abortController.current.signal;
        data.search
          .search<RequestBody, ResponseType>(requestBody, {
            abortSignal: signal,
          })
          .pipe(
            tap(() => {
              setIsFetching(true);
            })
          )
          .subscribe({
            next: (result) => {
              // Don't hand a result that arrived after cancellation to callers as a completed one.
              if (signal.aborted) {
                return resolve(null);
              }
              if (!isRunningResponse(result)) {
                setIsFetching(false);
                resolve(result);
              } else {
                // partial results
                // Ignore partial results for now.
                // An issue with the search function means partial results are not being returned correctly.
              }
            },
            error: (error) => {
              // Aborting with a custom reason may surface as a different error than AbortError.
              if (signal.aborted || error.name === 'AbortError') {
                return resolve(null);
              }
              setIsFetching(false);
              reject(error);
            },
          });
      });
    },
    [data.search, requestCancellationManager]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runRequest, cancelRequest, isLoading };
}
