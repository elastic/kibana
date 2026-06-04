/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { useStreamsAppFetch } from '../../../../../../hooks/use_streams_app_fetch';

export interface UseInheritedStreamResourceArgs<T> {
  http: HttpSetup;
  path: string;
  enabled: boolean;
  mapResponse: (response: unknown) => T;
}

export interface UseInheritedStreamResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  reset: () => void;
}

/**
 * Fetches an "inherited" stream resource (lifecycle / failure store) lazily,
 * only when `enabled` is true. Errors are surfaced to the user via the standard
 * Streams app fetch error toast.
 *
 * `reset` forces the resource to be re-fetched (e.g. after toggling inheritance
 * off and back on), even if `path`/`enabled` have not changed.
 */
export const useInheritedStreamResource = <T>({
  http,
  path,
  enabled,
  mapResponse,
}: UseInheritedStreamResourceArgs<T>): UseInheritedStreamResourceResult<T> => {
  const mapResponseRef = useRef(mapResponse);
  mapResponseRef.current = mapResponse;

  const state = useStreamsAppFetch<Promise<T | null>>(
    async ({ signal }) => {
      if (!enabled) {
        return null;
      }
      const response = await http.get(path, {
        headers: { 'X-Elastic-Internal-Origin': 'Kibana' },
        signal,
      });
      return mapResponseRef.current(response);
    },
    [enabled, http, path]
  );

  return { data: state.value ?? null, isLoading: state.loading, reset: state.refresh };
};
