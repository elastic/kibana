/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeActions } from '../../hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '../../hooks/use_fetch_group_actions';
import { AlertEpisodeActionsOverview } from './actions_overview';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeActionsOverviewSectionProps {
  episodeId: string;
  groupHash: string | undefined;
  services: AlertEpisodeDetailsServices;
}

export const AlertEpisodeActionsOverviewSection = ({
  episodeId,
  groupHash,
  services,
}: AlertEpisodeActionsOverviewSectionProps) => {
  const {
    data: episodeActionsMap,
    isLoading: isLoadingEpisodeActions,
    isError: isEpisodeActionsError,
  } = useFetchEpisodeActions({
    episodeIds: [episodeId],
    services,
  });

  const {
    data: groupActionsMap,
    isLoading: isLoadingGroupActions,
    isError: isGroupActionsError,
  } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    services,
  });

  if (isEpisodeActionsError || isGroupActionsError) {
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

  if (isLoadingEpisodeActions || (groupHash && isLoadingGroupActions)) {
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
