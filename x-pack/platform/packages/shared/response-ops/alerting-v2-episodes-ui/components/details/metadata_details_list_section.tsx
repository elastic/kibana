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
import { useFetchRule } from '../../hooks/use_fetch_rule';
import {
  getEpisodeDurationMs,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from '../../utils/episode_series_derived';
import { AlertEpisodeMetadataDetailsList } from './metadata_details_list';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

export interface AlertEpisodeMetadataDetailsListSectionProps {
  episodeId: string;
  services: AlertEpisodeDetailsServices;
}

export const AlertEpisodeMetadataDetailsListSection = ({
  episodeId,
  services,
}: AlertEpisodeMetadataDetailsListSectionProps) => {
  const {
    data: eventRows,
    isLoading: isLoadingEvents,
    isError: isEventsError,
  } = useFetchEpisodeEventsQuery({ episodeId, data: services.data });
  const rows = eventRows ?? [];

  const ruleId = getRuleIdFromEpisodeRows(rows);
  const triggeredAt = getTriggeredTimestamp(rows);
  const durationMs = getEpisodeDurationMs(rows);

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: [episodeId],
    expressions: services.expressions,
  });

  const {
    data: rule,
    isLoading: isLoadingRule,
    isError: isRuleError,
  } = useFetchRule({ id: ruleId, http: services.http });

  if (isEventsError || isRuleError) {
    return (
      <EuiText
        size="s"
        color="danger"
        data-test-subj="alertingV2EpisodeMetadataDetailsListSectionError"
      >
        {i18n.METADATA_DETAILS_LIST_SECTION_LOAD_ERROR}
      </EuiText>
    );
  }

  if (isLoadingEvents || (ruleId && isLoadingRule)) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="alertingV2EpisodeMetadataDetailsListSectionLoading"
      />
    );
  }

  const groupingFields = rule?.grouping?.fields ?? [];
  const assigneeUid = episodeActionsMap?.get(episodeId)?.lastAssigneeUid ?? undefined;

  return (
    <AlertEpisodeMetadataDetailsList
      episodeId={episodeId}
      groupingFields={groupingFields}
      triggeredAt={triggeredAt}
      durationMs={durationMs}
      assigneeUid={assigneeUid}
      userProfile={services.userProfile}
    />
  );
};
