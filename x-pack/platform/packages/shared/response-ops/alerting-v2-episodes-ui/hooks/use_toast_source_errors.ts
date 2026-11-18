/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { IToasts } from '@kbn/core-notifications-browser';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import { getEpisodeSourceAlertingName } from '../source_labels';
import type { EpisodeFetchErrorSurface } from '../types/episode_data_source';
import type { EpisodeSourceError } from '../utils/fetch_from_sources';
import { shouldSwallowFetchError } from '../utils/should_swallow_fetch_error';
import { EPISODES_FETCH_ERROR_TOAST_TITLE } from './translations';

/**
 * Toasts dual-source fetch errors, naming the failing source and swallowing
 * 401/403/503/AbortError.
 */
export const useToastSourceErrors = (
  sourceErrors: EpisodeSourceError[],
  toasts: Pick<IToasts, 'addError'> | undefined,
  surface: EpisodeFetchErrorSurface
): void => {
  const dataSource = useAdditionalEpisodesDataSource();
  const dataSourceId = dataSource?.id;
  const dataSourceLabel = dataSource?.label;
  useEffect(() => {
    if (!toasts) {
      return;
    }
    const sources =
      dataSourceId !== undefined && dataSourceLabel !== undefined
        ? [{ id: dataSourceId, label: dataSourceLabel }]
        : undefined;
    for (const { sourceId, error } of sourceErrors) {
      if (!shouldSwallowFetchError(error)) {
        toasts.addError(error, {
          title: EPISODES_FETCH_ERROR_TOAST_TITLE[surface](
            getEpisodeSourceAlertingName(sourceId, sources)
          ),
        });
      }
    }
  }, [sourceErrors, toasts, surface, dataSourceId, dataSourceLabel]);
};
