/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetchEpisodeQuery } from '../../hooks/use_fetch_episode_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
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
    data: episode,
    isLoading: isLoadingEpisode,
    isError: isEpisodeError,
  } = useFetchEpisodeQuery({ episodeId, services });

  const ruleId = episode?.['rule.id'];
  const triggeredAt = episode?.triggered_at;
  const durationMs = episode?.duration;

  const {
    data: rule,
    isLoading: isLoadingRule,
    isError: isRuleError,
  } = useFetchRule({ id: ruleId, http: services.http });

  if (isEpisodeError || isRuleError) {
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

  if (isLoadingEpisode || (ruleId && isLoadingRule)) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="alertingV2EpisodeMetadataDetailsListSectionLoading"
      />
    );
  }

  const groupingFields = rule?.grouping?.fields ?? [];
  const assigneeUid = episode?.last_assignee_uid ?? undefined;

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
