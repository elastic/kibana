/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiDescriptionList, EuiText, useEuiTheme } from '@elastic/eui';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertingEpisodeGroupingTags } from '../grouping/alerting_episode_grouping_tags';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { EMPTY_VALUE } from '../../constants';
import { formatDateTime } from '../../utils/format_date_time';
import * as i18n from './translations';

/**
 * Controls the grouping row, which is derived from the rule.
 */
export type GroupingRowStatus = 'visible' | 'hidden' | 'error';

export interface AlertEpisodeOverviewListProps {
  groupingFields: string[];
  groupingData: Record<string, unknown>;
  /** Source data view used to format grouping values with their field's `fieldFormats` formatter. */
  groupingDataView?: DataView;
  groupingStatus?: GroupingRowStatus;
  triggeredAt: string | undefined;
  durationMs: number | undefined;
  assigneeUid: string | undefined;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  userProfile: UserProfileService;
  dateFormat?: string;
}

export const AlertEpisodeOverviewList = ({
  groupingFields,
  groupingData,
  groupingDataView,
  groupingStatus = 'visible',
  triggeredAt,
  durationMs,
  assigneeUid,
  episodeAction,
  groupAction,
  userProfile,
  dateFormat,
}: AlertEpisodeOverviewListProps) => {
  const { euiTheme } = useEuiTheme();
  const isAcked = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isResolved = groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const isSnoozed = groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;

  return (
    <EuiDescriptionList
      data-test-subj="alertingV2EpisodeDetailsOverviewList"
      compressed
      type="responsiveColumn"
      columnWidths={['auto', '1fr']}
      columnGutterSize="m"
      css={css`
        & > dt,
        & > dd {
          line-height: ${euiTheme.size.l};
        }
      `}
      listItems={[
        ...(groupingStatus === 'hidden'
          ? []
          : [
              {
                title: i18n.METADATA_LIST_GROUPING_LABEL,
                description:
                  groupingStatus === 'error' ? (
                    <EuiText
                      size="s"
                      color="danger"
                      data-test-subj="alertingV2EpisodeDetailsOverviewListGroupingError"
                    >
                      {i18n.METADATA_LIST_GROUPING_ERROR}
                    </EuiText>
                  ) : (
                    <AlertingEpisodeGroupingTags
                      fields={groupingFields}
                      data={groupingData}
                      dataView={groupingDataView}
                      data-test-subj="alertingV2EpisodeDetailsOverviewListGroupingTags"
                    />
                  ),
              },
            ]),
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
        ...(isAcked
          ? [
              {
                title: i18n.ACTIONS_OVERVIEW_ACKNOWLEDGED_BY,
                description: (
                  <AlertEpisodeAssigneeCell
                    assigneeUid={episodeAction?.lastAckActor}
                    userProfile={userProfile}
                  />
                ),
              },
            ]
          : []),
        ...(isResolved
          ? [
              {
                title: i18n.ACTIONS_OVERVIEW_RESOLVED_BY,
                description: (
                  <AlertEpisodeAssigneeCell
                    assigneeUid={groupAction?.lastDeactivateActor}
                    userProfile={userProfile}
                  />
                ),
              },
            ]
          : []),
        ...(isSnoozed
          ? [
              {
                title: i18n.ACTIONS_OVERVIEW_SNOOZED_BY,
                description: (
                  <AlertEpisodeAssigneeCell
                    assigneeUid={groupAction?.lastSnoozeActor}
                    userProfile={userProfile}
                  />
                ),
              },
              {
                title: i18n.ACTIONS_OVERVIEW_SNOOZED_UNTIL,
                description: groupAction?.snoozeExpiry
                  ? formatDateTime(groupAction.snoozeExpiry, dateFormat)
                  : EMPTY_VALUE,
              },
            ]
          : []),
      ]}
    />
  );
};
