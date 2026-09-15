/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { EpisodeSourceError } from '../utils/fetch_from_sources';
import { shouldSwallowFetchError } from '../utils/should_swallow_fetch_error';
import {
  getEpisodesFetchErrorToastTitle,
  type EpisodeFetchErrorSurface,
} from './get_episodes_fetch_error_toast_title';

/**
 * Toasts dual-source fetch errors, swallowing 401/403/503/AbortError.
 */
export const useToastSourceErrors = (
  sourceErrors: EpisodeSourceError[],
  toasts: Pick<IToasts, 'addError'> | undefined,
  surface: EpisodeFetchErrorSurface
): void => {
  useEffect(() => {
    if (!toasts) {
      return;
    }
    for (const { sourceId, error } of sourceErrors) {
      if (!shouldSwallowFetchError(error)) {
        toasts.addError(error, { title: getEpisodesFetchErrorToastTitle(surface, sourceId) });
      }
    }
  }, [sourceErrors, toasts, surface]);
};
