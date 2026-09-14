/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { EpisodeSourceError } from '../utils/fetch_from_sources';
import { shouldSwallowFetchError } from '../utils/should_swallow_fetch_error';

export const EPISODES_LIST_ERROR_PREFIX = 'episodes-list';
export const EPISODES_KPIS_ERROR_PREFIX = 'episodes-kpis';
export const EPISODES_HISTOGRAM_ERROR_PREFIX = 'episodes-histogram';

export interface EpisodesPageErrorsApi {
  reportPageError: (id: string, error: Error | undefined) => void;
}

const EpisodesPageErrorsContext = createContext<EpisodesPageErrorsApi | undefined>(undefined);
const EpisodesPageErrorsMapContext = createContext<ReadonlyMap<string, Error>>(new Map());

export const EpisodesPageErrorsProvider = ({ children }: PropsWithChildren) => {
  const [errorsById, setErrorsById] = useState<ReadonlyMap<string, Error>>(() => new Map());

  const reportPageError = useCallback((id: string, error: Error | undefined) => {
    setErrorsById((prev) => {
      if (error) {
        if (prev.get(id) === error) {
          return prev;
        }
        const next = new Map(prev);
        next.set(id, error);
        return next;
      }
      if (!prev.has(id)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const api = useMemo<EpisodesPageErrorsApi>(() => ({ reportPageError }), [reportPageError]);

  return (
    <EpisodesPageErrorsContext.Provider value={api}>
      <EpisodesPageErrorsMapContext.Provider value={errorsById}>
        {children}
      </EpisodesPageErrorsMapContext.Provider>
    </EpisodesPageErrorsContext.Provider>
  );
};

/**
 * Visible page errors after swallowing 401/403/503/AbortError and deduping by message.
 */
export const usePageErrors = (): Error[] => {
  const errorsById = useContext(EpisodesPageErrorsMapContext);

  return useMemo(() => {
    const visible: Error[] = [];
    const seenMessages = new Set<string>();
    for (const error of errorsById.values()) {
      if (shouldSwallowFetchError(error) || seenMessages.has(error.message)) {
        continue;
      }
      seenMessages.add(error.message);
      visible.push(error);
    }
    return visible;
  }, [errorsById]);
};

/**
 * Reports a keyed error to the page banner. Clears the slot on unmount or when `error` is undefined.
 * No-ops when rendered outside `EpisodesPageErrorsProvider`.
 */
export const useReportPageError = (id: string, error: Error | undefined): void => {
  const api = useContext(EpisodesPageErrorsContext);

  useEffect(() => {
    api?.reportPageError(id, error);
    return () => {
      api?.reportPageError(id, undefined);
    };
  }, [api, id, error]);
};

/**
 * Syncs dual-source fetch errors into the page banner under `${prefix}:${sourceId}`.
 */
export const useReportSourceErrors = (prefix: string, sourceErrors: EpisodeSourceError[]): void => {
  const api = useContext(EpisodesPageErrorsContext);
  const previousIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!api) {
      return;
    }

    const nextIds = new Set<string>();
    for (const { sourceId, error } of sourceErrors) {
      const id = `${prefix}:${sourceId}`;
      nextIds.add(id);
      api.reportPageError(id, error);
    }
    for (const id of previousIdsRef.current) {
      if (!nextIds.has(id)) {
        api.reportPageError(id, undefined);
      }
    }
    previousIdsRef.current = nextIds;

    return () => {
      for (const id of nextIds) {
        api.reportPageError(id, undefined);
      }
      previousIdsRef.current = new Set();
    };
  }, [api, prefix, sourceErrors]);
};
