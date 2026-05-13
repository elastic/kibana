/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActions } from '../../hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '../../hooks/use_fetch_group_actions';
import { getGroupHashFromEpisodeRows } from '../../utils/episode_series_derived';
import { AlertEpisodeActionsOverview } from './actions_overview';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeActionsOverviewSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
}

export const AlertEpisodeActionsOverviewSection = ({
  episodeId,
  services,
}: AlertEpisodeActionsOverviewSectionProps) => {
  const {
    data: eventRows,
    isLoading: isLoadingEvents,
    isError: isEventsError,
  } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });
  const rows = eventRows ?? [];

  const groupHash = getGroupHashFromEpisodeRows(rows);

  const { data: episodeActionsMap, isError: isEpisodeActionsError } = useFetchEpisodeActions({
    episodeIds: [episodeId],
    expressions: services.expressions,
  });

  const { data: groupActionsMap, isError: isGroupActionsError } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    expressions: services.expressions,
  });

  if (isEventsError || isEpisodeActionsError || isGroupActionsError) {
    return (
      <EuiText
        size="s"
        color="danger"
        data-test-subj="alertingV2EpisodeActionsOverviewSectionError"
      >
        {i18n.ACTIONS_OVERVIEW_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  if (isLoadingEvents) {
    return (
      <EuiLoadingSpinner size="m" data-test-subj="alertingV2EpisodeActionsOverviewSectionLoading" />
    );
  }

  const episodeAction = episodeActionsMap?.get(episodeId);
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;

  return (
    <AlertEpisodeActionsOverview
      episodeAction={episodeAction}
      groupAction={groupAction}
      userProfile={services.userProfile}
    />
  );
};
