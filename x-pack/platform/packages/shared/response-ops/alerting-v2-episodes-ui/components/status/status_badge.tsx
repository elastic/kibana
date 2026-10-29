/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { AlertTimelineStatusDot } from '../../alert_timeline/alert_timeline_status_dot';

export interface AlertEpisodeStatusBadgeProps {
  status: AlertEpisodeStatus;
  children?: React.ReactNode;
  'data-test-subj'?: string;
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
 * Lifecycle-colored dot and status label, for hosts that already own the hollow badge chrome.
 * Draws the dot directly instead of using EuiHealth, whose dot glyph is inset within a 16px icon
 * box and shifts the badge content off-center.
 */
export function AlertEpisodeStatusHealth({
  status,
  children,
}: Pick<AlertEpisodeStatusBadgeProps, 'status' | 'children'>) {
  const { euiTheme } = useEuiTheme();

  return (
    <span css={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.s }}>
      <AlertTimelineStatusDot status={status} data-test-subj="alertEpisodeStatusDot" />
      {children ?? getEpisodeStatusBadgeLabel(status)}
    </span>
  );
}

/**
 * Renders a hollow badge with a Lifecycle-colored health dot for an alerting episode status.
 */
export function AlertEpisodeStatusBadge({
  status,
  children,
  'data-test-subj': dataTestSubj,
}: AlertEpisodeStatusBadgeProps) {
  return (
    <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
      <AlertEpisodeStatusHealth status={status}>{children}</AlertEpisodeStatusHealth>
    </EuiBadge>
  );
}
