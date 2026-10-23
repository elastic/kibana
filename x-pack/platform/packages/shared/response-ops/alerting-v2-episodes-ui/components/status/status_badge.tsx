/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiHealth, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { alertTimelineStatusColor } from '../../alert_timeline/alert_timeline_status_palette';

export interface AlertEpisodeStatusBadgeProps {
  status: AlertEpisodeStatus;
}

const STATUS_LABELS: Record<AlertEpisodeStatus, string> = {
  [ALERT_EPISODE_STATUS.ACTIVE]: i18n.translate(
    'xpack.alertingV2EpisodesUi.activeStatusBadgeLabel',
    {
      defaultMessage: 'Active',
    }
  ),
  [ALERT_EPISODE_STATUS.RECOVERING]: i18n.translate(
    'xpack.alertingV2EpisodesUi.recoveringStatusBadgeLabel',
    {
      defaultMessage: 'Recovering',
    }
  ),
  [ALERT_EPISODE_STATUS.PENDING]: i18n.translate(
    'xpack.alertingV2EpisodesUi.pendingStatusBadgeLabel',
    {
      defaultMessage: 'Pending',
    }
  ),
  [ALERT_EPISODE_STATUS.INACTIVE]: i18n.translate(
    'xpack.alertingV2EpisodesUi.inactiveStatusBadgeLabel',
    {
      defaultMessage: 'Inactive',
    }
  ),
};

/** Returns the display label for a given episode status, reusing the same i18n strings as the badge component. */
export const getEpisodeStatusBadgeLabel = (status: AlertEpisodeStatus): string =>
  STATUS_LABELS[status] ??
  i18n.translate('xpack.alertingV2EpisodesUi.unknownStatusBadgeLabel', {
    defaultMessage: 'Unknown',
  });

/**
 * Renders a hollow badge with a Lifecycle-colored health dot for an alerting episode status.
 */
export function AlertEpisodeStatusBadge({ status }: AlertEpisodeStatusBadgeProps) {
  const { euiTheme } = useEuiTheme();
  const color = alertTimelineStatusColor(euiTheme, status);

  return (
    <EuiBadge color="hollow">
      <EuiHealth color={color} textSize="inherit">
        {getEpisodeStatusBadgeLabel(status)}
      </EuiHealth>
    </EuiBadge>
  );
}
