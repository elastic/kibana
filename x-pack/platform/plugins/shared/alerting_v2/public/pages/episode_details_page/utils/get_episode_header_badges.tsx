/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import {
  ALERT_EPISODE_ACTION_TYPE,
  ALERT_EPISODE_STATUS,
  type AlertEpisodeStatus,
} from '@kbn/alerting-v2-schemas';
import type {
  EpisodeActionState,
  AlertEpisodeGroupAction,
} from '@kbn/alerting-v2-episodes-ui/types/action';
import {
  EPISODE_SEVERITY_BADGE_COLORS,
  getEpisodeSeverityLabel,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
} from '@kbn/alerting-v2-episodes-ui/components/severity/severity_utils';
import * as i18n from '../translations';

export interface EpisodeHeaderBadgesArgs {
  status: AlertEpisodeStatus | undefined;
  severity: string | undefined | null;
  tags: string[];
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
}

type AppHeaderBadgeColor = NonNullable<AppHeaderBadge['color']>;

const STATUS_BADGE_COLORS: Record<AlertEpisodeStatus, AppHeaderBadgeColor> = {
  [ALERT_EPISODE_STATUS.INACTIVE]: 'success',
  [ALERT_EPISODE_STATUS.PENDING]: 'warning',
  [ALERT_EPISODE_STATUS.ACTIVE]: 'danger',
  [ALERT_EPISODE_STATUS.RECOVERING]: 'primary',
};

const STATUS_BADGE_LABELS: Record<AlertEpisodeStatus, string> = {
  [ALERT_EPISODE_STATUS.INACTIVE]: i18n.STATUS_BADGE_INACTIVE,
  [ALERT_EPISODE_STATUS.PENDING]: i18n.STATUS_BADGE_PENDING,
  [ALERT_EPISODE_STATUS.ACTIVE]: i18n.STATUS_BADGE_ACTIVE,
  [ALERT_EPISODE_STATUS.RECOVERING]: i18n.STATUS_BADGE_RECOVERING,
};

const getStatusBadgeColor = (status: AlertEpisodeStatus): AppHeaderBadgeColor =>
  STATUS_BADGE_COLORS[status] ?? 'hollow';

const getStatusBadgeLabel = (status: AlertEpisodeStatus): string =>
  STATUS_BADGE_LABELS[status] ?? i18n.STATUS_BADGE_UNKNOWN;

const getEffectiveStatus = (
  status: AlertEpisodeStatus | undefined,
  groupAction: AlertEpisodeGroupAction | undefined
): AlertEpisodeStatus | undefined => {
  if (!status) {
    return undefined;
  }

  if (groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE) {
    return ALERT_EPISODE_STATUS.INACTIVE;
  }

  return status;
};

const getSeverityBadgeColor = (severity: string): AppHeaderBadgeColor => {
  const normalized = normalizeEpisodeSeverity(severity);
  const color = EPISODE_SEVERITY_BADGE_COLORS[normalized];

  if (color === 'risk') {
    return 'warning';
  }

  return color as AppHeaderBadgeColor;
};

const getSnoozeTooltip = (groupAction: AlertEpisodeGroupAction): string => {
  if (groupAction.snoozeExpiry) {
    return i18n.getSnoozedUntilTooltip(new Date(groupAction.snoozeExpiry));
  }

  return i18n.SNOOZED_BADGE_TOOLTIP;
};

// Native AppHeader badges have no icon slot, so ack/snooze render through `renderCustomBadge` to
// restore the original icon-and-tooltip badges (checkCircle / bellSlash) from the shared status row.
const renderIconBadge =
  (iconType: string, tooltip: string, dataTestSubj: string) =>
  ({ badgeText }: { badgeText: string }) =>
    (
      <EuiToolTip content={tooltip} disableScreenReaderOutput>
        <EuiBadge
          color="hollow"
          iconType={iconType}
          iconSide="left"
          tabIndex={0}
          data-test-subj={dataTestSubj}
        >
          {badgeText}
        </EuiBadge>
      </EuiToolTip>
    );

const renderFilledBadge =
  (color: EuiBadgeProps['color'], dataTestSubj: string) =>
  ({ badgeText }: { badgeText: string }) =>
    (
      <EuiBadge color={color} fill data-test-subj={dataTestSubj}>
        {badgeText}
      </EuiBadge>
    );

export const getEpisodeHeaderBadges = ({
  status,
  severity,
  tags,
  episodeAction,
  groupAction,
}: EpisodeHeaderBadgesArgs): AppHeaderBadge[] => {
  const badges: AppHeaderBadge[] = [];
  const effectiveStatus = getEffectiveStatus(status, groupAction);

  if (effectiveStatus) {
    badges.push({
      label: getStatusBadgeLabel(effectiveStatus),
      color: getStatusBadgeColor(effectiveStatus),
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderStatusBadge',
    });
  }

  if (episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK) {
    badges.push({
      label: i18n.ACKNOWLEDGED_BADGE_LABEL,
      color: 'hollow',
      tooltip: i18n.ACKNOWLEDGED_BADGE_TOOLTIP,
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderAckBadge',
      renderCustomBadge: renderIconBadge(
        'checkCircle',
        i18n.ACKNOWLEDGED_BADGE_TOOLTIP,
        'alertingV2EpisodeDetailsHeaderAckBadge'
      ),
    });
  }

  if (groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE) {
    const snoozeTooltip = getSnoozeTooltip(groupAction);
    badges.push({
      label: i18n.SNOOZED_BADGE_LABEL,
      color: 'hollow',
      tooltip: snoozeTooltip,
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderSnoozeBadge',
      renderCustomBadge: renderIconBadge(
        'bellSlash',
        snoozeTooltip,
        'alertingV2EpisodeDetailsHeaderSnoozeBadge'
      ),
    });
  }

  if (isSupportedEpisodeSeverity(severity)) {
    const normalized = normalizeEpisodeSeverity(severity);
    const severityColor = getSeverityBadgeColor(severity);
    badges.push({
      label: getEpisodeSeverityLabel(normalized),
      color: severityColor,
      'data-test-subj': `alertingV2EpisodeSeverityBadge-${normalized}`,
      // `renderCustomBadge` is used here to ensure the badge is filled with the appropriate severity color, as native AppHeader badges do not support "fill" styling.
      renderCustomBadge: renderFilledBadge(
        severityColor,
        `alertingV2EpisodeSeverityBadge-${normalized}`
      ),
    });
  }

  for (const tag of tags) {
    badges.push({
      label: tag,
      color: 'hollow',
      'data-test-subj': `alertingV2EpisodeDetailsHeaderTagBadge-${tag}`,
    });
  }

  return badges;
};
