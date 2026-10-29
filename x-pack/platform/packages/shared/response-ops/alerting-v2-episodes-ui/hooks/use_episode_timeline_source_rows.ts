/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useFetchEpisodeEventsQuery } from './use_fetch_episode_events_query';
import { useFetchEpisodeEventCountQuery } from './use_fetch_episode_event_count_query';
import {
  useFetchEpisodeCollapsedEventsQuery,
  type EpisodeTimelineSeverityRow,
  type EpisodeTimelineStatusRow,
} from './use_fetch_episode_collapsed_events_query';

export interface UseEpisodeTimelineSourceRowsOptions {
  episodeId: string | undefined;
  ruleId: string | undefined;
  services: { data: DataPublicPluginStart; spaces: SpacesPluginStart };
}

export interface EpisodeTimelineSourceRows {
  statusRows: EpisodeTimelineStatusRow[];
  severityRows: EpisodeTimelineSeverityRow[];
  isCollapsed: boolean;
  /** The ES|QL row limit the events query was cut off at; set only when the rows are collapsed. */
  collapsedEventLimit: number | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Returns an episode's status and severity rows for its timelines: every event,
 * or one collapsed row per status and per severity when the unbounded events
 * query was cut off at the cluster's ES|QL default limit.
 */
export const useEpisodeTimelineSourceRows = ({
  episodeId,
  ruleId,
  services,
}: UseEpisodeTimelineSourceRowsOptions): EpisodeTimelineSourceRows => {
  const {
    data: eventRows = [],
    isLoading: isLoadingEventRows,
    isError,
  } = useFetchEpisodeEventsQuery({ episodeId, services });

  const { data: eventCount, isLoading: isLoadingEventCount } = useFetchEpisodeEventCountQuery({
    episodeId,
    services,
  });

  const isTruncated =
    !isLoadingEventRows && eventCount !== undefined && eventCount > eventRows.length;

  const { data: collapsedEvents, isInitialLoading: isLoadingCollapsedEvents } =
    useFetchEpisodeCollapsedEventsQuery({
      episodeId,
      ruleId,
      enabled: isTruncated,
      services,
    });

  const isCollapsed = isTruncated && collapsedEvents !== undefined;

  return {
    statusRows: isCollapsed ? collapsedEvents.statusRows : eventRows,
    severityRows: isCollapsed ? collapsedEvents.severityRows : eventRows,
    isCollapsed,
    collapsedEventLimit: isCollapsed ? eventRows.length : undefined,
    isLoading: isLoadingEventRows || isLoadingEventCount || isLoadingCollapsedEvents,
    isError,
  };
};
