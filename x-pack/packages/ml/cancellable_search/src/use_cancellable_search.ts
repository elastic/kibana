/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { type IKibanaSearchResponse, isRunningResponse } from '@kbn/data-plugin/common';
import { tap } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface UseCancellableSearch {
  runRequest: <RequestBody, ResponseType extends IKibanaSearchResponse>(
    requestBody: RequestBody,
    options?: object
  ) => Promise<ResponseType | null>;
  cancelRequest: () => void;
  isLoading: boolean;
}

// Similar to aiops/hooks/use_cancellable_search.ts
export function useCancellableSearch(data: DataPublicPluginStart) {
  const abortController = useRef(new AbortController());
  const [isLoading, setIsFetching] = useState<boolean>(false);

  const runRequest = useCallback(
    <RequestBody, ResponseType extends IKibanaSearchResponse>(
      requestBody: RequestBody,
      options = {}
    ): Promise<ResponseType | null> => {
      return new Promise((resolve, reject) => {
        data.search
          // @ts-expect-error upgrade typescript v4.9.5
          .search<RequestBody, ResponseType>(requestBody, {
            abortSignal: abortController.current.signal,
            ...options,
          })
          .pipe(
            tap(() => {
              setIsFetching(true);
            })
          )
          .subscribe({
            next: (result) => {
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
              if (error.name === 'AbortError') {
                return resolve(null);
              }
              setIsFetching(false);
              reject(error);
            },
          });
      });
    },
    [data.search]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runRequest, cancelRequest, isLoading };
}
