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
import {
  AlertEpisodeStatusBadge,
  getEpisodeStatusBadgeLabel,
} from '@kbn/alerting-v2-episodes-ui/components/status/status_badge';
import { FlappingBadge } from '@kbn/alerting-v2-episodes-ui/components/flapping/flapping_badge';
import { FLAPPING_BADGE_LABEL } from '@kbn/alerting-v2-episodes-ui/components/flapping/translations';
import { isEpisodeSnoozed } from '@kbn/alerting-v2-episodes-ui/utils/is_episode_snoozed';
import * as i18n from '../translations';

export interface EpisodeHeaderBadgesArgs {
  status: AlertEpisodeStatus | undefined;
  severity: string | undefined | null;
  episodeAction: EpisodeActionState | undefined;
  groupAction: AlertEpisodeGroupAction | undefined;
  isFlapping?: boolean;
}

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

const getSnoozeTooltip = (groupAction: AlertEpisodeGroupAction): string => {
  if (groupAction.snoozedUntil) {
    return i18n.getSnoozedUntilTooltip(new Date(groupAction.snoozedUntil));
  }

  return i18n.SNOOZED_BADGE_TOOLTIP;
};

// Native AppHeader badges have no icon slot, so ack/snooze render through `renderCustomBadge` to
// restore the original icon-and-tooltip badges (checkCircle / bellSlash) from the shared status row.
const renderIconBadge =
  (iconType: string, tooltip: string, dataTestSubj: string) =>
  ({ badgeText }: { badgeText: string }) =>
    (
      <EuiToolTip
        content={tooltip}
        disableScreenReaderOutput
        anchorProps={{ css: { display: 'flex' } }}
      >
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

const renderSeverityBadge =
  (color: EuiBadgeProps['color'], dataTestSubj: string) =>
  ({ badgeText }: { badgeText: string }) =>
    (
      <EuiBadge color={color} data-test-subj={dataTestSubj}>
        {badgeText}
      </EuiBadge>
    );

const renderFlappingBadge = (_props: { badgeText: string }) => <FlappingBadge />;

const renderStatusBadge =
  (status: AlertEpisodeStatus) =>
  ({ badgeText }: { badgeText: string }) =>
    (
      <AlertEpisodeStatusBadge
        status={status}
        data-test-subj="alertingV2EpisodeDetailsHeaderStatusBadge"
      >
        {badgeText}
      </AlertEpisodeStatusBadge>
    );

// The app header caps badges at three, so status/severity/action badges
// would otherwise be crowded out by a variable number of tag badges.
export const getEpisodeHeaderBadges = ({
  status,
  severity,
  episodeAction,
  groupAction,
  isFlapping = false,
}: EpisodeHeaderBadgesArgs): AppHeaderBadge[] => {
  const badges: AppHeaderBadge[] = [];
  const effectiveStatus = getEffectiveStatus(status, groupAction);

  if (effectiveStatus) {
    badges.push({
      label: getEpisodeStatusBadgeLabel(effectiveStatus),
      color: 'hollow',
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderStatusBadge',
      renderCustomBadge: renderStatusBadge(effectiveStatus),
    });
  }

  if (isFlapping) {
    badges.push({
      label: FLAPPING_BADGE_LABEL,
      color: 'hollow',
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderFlappingBadge',
      // Shared FlappingBadge owns the popover; render it via custom badge so AppHeader
      // does not wrap it in a plain EuiBadge.
      renderCustomBadge: renderFlappingBadge,
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

  if (groupAction && isEpisodeSnoozed(groupAction.lastSnoozeAction, groupAction.snoozedUntil)) {
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
    const severityColor = EPISODE_SEVERITY_BADGE_COLORS[normalized];
    badges.push({
      label: getEpisodeSeverityLabel(normalized),
      color: 'default',
      'data-test-subj': `alertingV2EpisodeSeverityBadge-${normalized}`,
      // AppHeader badge colors omit `risk` / `neutral`; render through EuiBadge so the
      // shared severity tokens apply.
      renderCustomBadge: renderSeverityBadge(
        severityColor,
        `alertingV2EpisodeSeverityBadge-${normalized}`
      ),
    });
  }

  return badges;
};
