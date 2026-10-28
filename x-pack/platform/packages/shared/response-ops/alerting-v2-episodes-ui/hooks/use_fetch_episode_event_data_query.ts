/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useFetchEpisodeDataQuery } from './use_fetch_episode_data_query';
import { useFetchEpisodeQuery } from './use_fetch_episode_query';

export interface UseFetchEpisodeEventDataQueryOptions {
  episodeId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface EpisodeEventData {
  /** Parsed `data` object from the latest non-empty event. */
  data: Record<string, unknown>;
  /** Timestamp of the event that produced `data`. */
  dataTimestamp: string;
  /**
   * `true` when the latest event for the episode does not carry `data`
   * (e.g. an inactive/recovery event), so the displayed `data` is older
   * than the most recent event.
   */
  isStale: boolean;
}

export interface UseFetchEpisodeEventDataQueryResult {
  /** `null` when no event with non-empty data is available yet. */
  data: EpisodeEventData | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

const parseEventData = (episodeData: string | null): Record<string, unknown> | null => {
  if (!episodeData) return null;
  try {
    return JSON.parse(episodeData) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Derives the alert `data` object from the latest non-empty event for an
 * episode, along with the timestamp of that event and a flag indicating
 * whether a more recent event without data exists. It reuses the episode data
 * and episode row queries, so it adds no requests of its own.
 */
export const useFetchEpisodeEventDataQuery = ({
  episodeId,
  services,
}: UseFetchEpisodeEventDataQueryOptions): UseFetchEpisodeEventDataQueryResult => {
  const dataQuery = useFetchEpisodeDataQuery({ episodeId, services });
  const { data: episode, isLoading: isLoadingEpisode } = useFetchEpisodeQuery({
    episodeId,
    services,
  });

  const dataRow = dataQuery.data;
  const lastEventTimestamp = episode?.last_timestamp;
  const eventData = useMemo((): EpisodeEventData | null | undefined => {
    if (dataRow === undefined) return undefined;
    const parsed = parseEventData(dataRow?.episode_data ?? null);
    if (!dataRow || !parsed) return null;
    return {
      data: parsed,
      dataTimestamp: dataRow['@timestamp'],
      isStale: Boolean(lastEventTimestamp && lastEventTimestamp !== dataRow['@timestamp']),
    };
  }, [dataRow, lastEventTimestamp]);

  return {
    data: eventData,
    // The stale flag needs the episode row, so wait for both.
    isLoading: dataQuery.isLoading || isLoadingEpisode,
    isError: dataQuery.isError,
  };
};
