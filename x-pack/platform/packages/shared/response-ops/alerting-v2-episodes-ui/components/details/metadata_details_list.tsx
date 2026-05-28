/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { AlertingEpisodeGroupingTags } from '../grouping/alerting_episode_grouping_tags';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { EMPTY_VALUE } from '../../constants';
import { formatDateTime } from '../../utils/format_date_time';
import * as i18n from './translations';

export interface AlertEpisodeMetadataDetailsListProps {
  groupingFields: string[];
  groupingData: Record<string, unknown>;
  triggeredAt: string | undefined;
  durationMs: number | undefined;
  assigneeUid: string | undefined;
  userProfile: UserProfileService;
  dateFormat?: string;
}

export const AlertEpisodeMetadataDetailsList = ({
  groupingFields,
  groupingData,
  triggeredAt,
  durationMs,
  assigneeUid,
  userProfile,
  dateFormat,
}: AlertEpisodeMetadataDetailsListProps) => {
  return (
    <EuiDescriptionList
      data-test-subj="alertingV2EpisodeDetailsMetadataList"
      compressed
      type="responsiveColumn"
      listItems={[
        {
          title: i18n.METADATA_LIST_GROUPING_LABEL,
          description: (
            <AlertingEpisodeGroupingTags
              fields={groupingFields}
              data={groupingData}
              data-test-subj="alertingV2EpisodeDetailsMetadataListGroupingTags"
            />
          ),
        },
        {
          title: i18n.METADATA_LIST_TRIGGERED_LABEL,
          description: triggeredAt ? formatDateTime(triggeredAt, dateFormat) : EMPTY_VALUE,
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
