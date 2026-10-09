/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';

export interface AlertEpisodeStatusBadgeProps {
  status: AlertEpisodeStatus;
}

/** Colors shared between the status badge and the status filter's dot indicator. */
export const EPISODE_STATUS_BADGE_COLORS: Record<
  AlertEpisodeStatus,
  NonNullable<EuiBadgeProps['color']>
> = {
  [ALERT_EPISODE_STATUS.ACTIVE]: 'danger',
  [ALERT_EPISODE_STATUS.RECOVERING]: 'primary',
  [ALERT_EPISODE_STATUS.PENDING]: 'warning',
  [ALERT_EPISODE_STATUS.INACTIVE]: 'success',
};

/**
 * Renders a badge indicating the status of an alerting episode.
 */
export function AlertEpisodeStatusBadge({ status }: AlertEpisodeStatusBadgeProps) {
  if (status === ALERT_EPISODE_STATUS.INACTIVE) {
    return (
      <EuiBadge color={EPISODE_STATUS_BADGE_COLORS[status]}>
        {i18n.translate('xpack.alertingV2EpisodesUi.inactiveStatusBadgeLabel', {
          defaultMessage: 'Inactive',
        })}
      </EuiBadge>
    );
  }
  if (status === ALERT_EPISODE_STATUS.PENDING) {
    return (
      <EuiBadge color={EPISODE_STATUS_BADGE_COLORS[status]}>
        {i18n.translate('xpack.alertingV2EpisodesUi.pendingStatusBadgeLabel', {
          defaultMessage: 'Pending',
        })}
      </EuiBadge>
    );
  }
  if (status === ALERT_EPISODE_STATUS.ACTIVE) {
    return (
      <EuiBadge color={EPISODE_STATUS_BADGE_COLORS[status]}>
        {i18n.translate('xpack.alertingV2EpisodesUi.activeStatusBadgeLabel', {
          defaultMessage: 'Active',
        })}
      </EuiBadge>
    );
  }
  if (status === ALERT_EPISODE_STATUS.RECOVERING) {
    return (
      <EuiBadge color={EPISODE_STATUS_BADGE_COLORS[status]}>
        {i18n.translate('xpack.alertingV2EpisodesUi.recoveringStatusBadgeLabel', {
          defaultMessage: 'Recovering',
        })}
      </EuiBadge>
    );
  }
  return (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.alertingV2EpisodesUi.unknownStatusBadgeLabel', {
        defaultMessage: 'Unknown',
      })}
    </EuiBadge>
  );
}
