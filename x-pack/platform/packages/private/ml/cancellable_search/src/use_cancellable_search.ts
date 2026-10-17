/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/search-types';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { tap } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface UseCancellableSearch {
  runRequest: <
    RequestBody extends IKibanaSearchRequest,
    ResponseType extends IKibanaSearchResponse
  >(
    requestBody: RequestBody,
    options?: ISearchOptions
  ) => Promise<ResponseType | null>;
  cancelRequest: () => void;
  isLoading: boolean;
}

/**
 * Structural type of `RequestCancellationManager` from `@kbn/presentation-publishing`,
 * so this package doesn't need to depend on it.
 */
export interface RequestCancellationLike {
  readonly signal: AbortSignal;
  createChildController(): AbortController;
}

// Similar to aiops/hooks/use_cancellable_search.ts
export function useCancellableSearch(
  data: DataPublicPluginStart,
  requestCancellationManager?: RequestCancellationLike
) {
  // Lazily created so rendering doesn't attach a new listener to the manager each time
  const [initialController] = useState(
    () => requestCancellationManager?.createChildController() ?? new AbortController()
  );
  const abortController = useRef<AbortController>(initialController);
  const [isLoading, setIsFetching] = useState<boolean>(false);

  const runRequest = useCallback(
    <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(
      requestBody: RequestBody,
      options = {}
    ): Promise<ResponseType | null> => {
      // A controller aborted by the manager stays aborted until the next load starts,
      // at which point the manager's signal is replaced and we need a fresh child.
      if (
        requestCancellationManager &&
        abortController.current.signal.aborted &&
        !requestCancellationManager.signal.aborted
      ) {
        abortController.current = requestCancellationManager.createChildController();
      }

      return new Promise((resolve, reject) => {
        data.search
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
    [data.search, requestCancellationManager]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current =
      requestCancellationManager?.createChildController() ?? new AbortController();
  }, [requestCancellationManager]);

  return { runRequest, cancelRequest, isLoading };
}
