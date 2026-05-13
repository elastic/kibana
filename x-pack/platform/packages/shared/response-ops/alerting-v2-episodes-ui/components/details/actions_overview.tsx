/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import * as i18n from './translations';

export interface AlertEpisodeActionsOverviewProps {
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  userProfile: UserProfileService;
}

const EMPTY_VALUE = '—';

const formatSnoozeExpiry = (snoozeExpiry: string): string =>
  new Date(snoozeExpiry).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const AlertEpisodeActionsOverview = ({
  episodeAction,
  groupAction,
  userProfile,
}: AlertEpisodeActionsOverviewProps) => {
  const isAcked = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isResolved = groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const isSnoozed = groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;
  const hasNoActors = !isAcked && !isResolved && !isSnoozed;

  if (hasNoActors) {
    return (
      <EuiText
        size="s"
        color="subdued"
        data-test-subj="alertingV2EpisodeDetailsActionsOverviewEmpty"
      >
        {i18n.ACTIONS_OVERVIEW_EMPTY}
      </EuiText>
    );
  }

  return (
    <EuiDescriptionList
      data-test-subj="alertingV2EpisodeDetailsActionsOverviewList"
      compressed
      type="responsiveColumn"
      listItems={[
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
                  ? formatSnoozeExpiry(groupAction.snoozeExpiry)
                  : EMPTY_VALUE,
              },
            ]
          : []),
      ]}
    />
  );
};
