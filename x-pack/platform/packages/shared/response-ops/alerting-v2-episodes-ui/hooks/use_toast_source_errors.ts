/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { EpisodeFetchErrorSurface } from '../types/episode_data_source';
import type { EpisodeSourceError } from '../utils/fetch_from_sources';
import { shouldSwallowFetchError } from '../utils/should_swallow_fetch_error';
import { EPISODES_FETCH_ERROR_TOAST_TITLE } from './translations';

interface HttpStatusCarrier {
  response?: { status?: number };
  body?: { statusCode?: number };
  statusCode?: number;
}

const toastDedupeKey = (sourceId: string, error: Error): string => {
  const carrier = error as Error & HttpStatusCarrier;
  const status = carrier.response?.status ?? carrier.body?.statusCode ?? carrier.statusCode;
  return `${sourceId}:${status ?? error.message}`;
};

/**
 * Toasts dual-source fetch errors, naming the failing source and swallowing
 * 401/403/503/AbortError. Steady-state failures toast once per source/status
 * until that error clears.
 */
export const useToastSourceErrors = (
  sourceErrors: EpisodeSourceError[],
  toasts: Pick<IToasts, 'addError'> | undefined,
  surface: EpisodeFetchErrorSurface
): void => {
  const toastedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    if (!toasts) {
      return;
    }

    const currentKeys = new Set<string>();
    for (const { sourceId, error } of sourceErrors) {
      if (shouldSwallowFetchError(error)) {
        continue;
      }
      const key = toastDedupeKey(sourceId, error);
      currentKeys.add(key);
      if (toastedKeysRef.current.has(key)) {
        continue;
      }
      toastedKeysRef.current.add(key);
      toasts.addError(error, { title: EPISODES_FETCH_ERROR_TOAST_TITLE[surface](sourceId) });
    }

    for (const key of toastedKeysRef.current) {
      if (!currentKeys.has(key)) {
        toastedKeysRef.current.delete(key);
      }
    }
  }, [sourceErrors, toasts, surface]);
};
