/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-plugin/server/resources/alert_events';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '../../../types/episode_action';
import { AlertEpisodeStatusBadge } from './alert_episode_status_badge';

export interface AlertEpisodeStatusCellProps {
  status: AlertEpisodeStatus;
  episodeAction?: EpisodeAction;
}

export function AlertEpisodeStatusCell({ status, episodeAction }: AlertEpisodeStatusCellProps) {
  const isAcknowledged = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isSnoozed = episodeAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={true}
      wrap={false}
      alignItems="center"
      data-test-subj="alertEpisodeStatusCell"
    >
      <EuiFlexItem grow={false}>
        <AlertEpisodeStatusBadge
          status={
            episodeAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE
              ? 'inactive'
              : status
          }
        />
      </EuiFlexItem>
      {isSnoozed && (
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="bellSlash" data-test-subj="alertEpisodeStatusCellSnoozeIndicator" />
        </EuiFlexItem>
      )}
      {isAcknowledged && (
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="checkCircle" data-test-subj="alertEpisodeStatusCellAckIndicator" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
