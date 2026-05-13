/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { AlertEpisodeGroupingFields } from '../grouping/grouping_fields';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import * as i18n from './translations';

export interface AlertEpisodeMetadataDetailsListProps {
  episodeId: string;
  groupingFields: string[];
  triggeredAt: string | undefined;
  durationMs: number | undefined;
  assigneeUid: string | undefined;
  userProfile: UserProfileService;
}

const EMPTY_VALUE = '—';

const formatTriggeredAt = (triggeredAt: string): string =>
  new Date(triggeredAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const AlertEpisodeMetadataDetailsList = ({
  episodeId,
  groupingFields,
  triggeredAt,
  durationMs,
  assigneeUid,
  userProfile,
}: AlertEpisodeMetadataDetailsListProps) => {
  return (
    <EuiDescriptionList
      data-test-subj="alertingV2EpisodeDetailsMetadataList"
      compressed
      type="responsiveColumn"
      listItems={[
        {
          title: i18n.METADATA_LIST_EPISODE_ID_LABEL,
          description: episodeId ?? EMPTY_VALUE,
        },
        {
          title: i18n.METADATA_LIST_GROUPING_LABEL,
          description: <AlertEpisodeGroupingFields fields={groupingFields} />,
        },
        {
          title: i18n.METADATA_LIST_TRIGGERED_LABEL,
          description: triggeredAt ? formatTriggeredAt(triggeredAt) : EMPTY_VALUE,
        },
        {
          title: i18n.METADATA_LIST_DURATION_LABEL,
          description:
            durationMs != null ? i18n.formatMetadataListDuration(durationMs) : EMPTY_VALUE,
        },
        {
          title: i18n.METADATA_LIST_ASSIGNEE_LABEL,
          description: (
            <AlertEpisodeAssigneeCell assigneeUid={assigneeUid} userProfile={userProfile} />
          ),
        },
      ]}
    />
  );
};
