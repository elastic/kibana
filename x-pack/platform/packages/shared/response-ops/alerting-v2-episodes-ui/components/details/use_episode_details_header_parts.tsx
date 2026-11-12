/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { EuiBadgeProps, IconType } from '@elastic/eui';
import { EuiBadge, EuiLink, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InfoBlockItem } from '@kbn/flyout-info-blocks';
import { parseEpisodeDataJson } from '@kbn/alerting-v2-utils';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { EDIT_EPISODE_ASSIGNEE_ACTION_ID } from '../../actions/edit_assignee';
import type { EpisodeAction } from '../../actions/types';
import type { EpisodeDetailsHeaderData } from '../../hooks/use_episode_details_header_data';
import { isEpisodeSnoozed } from '../../utils/is_episode_snoozed';
import { formatDateTime } from '../../utils/format_date_time';
import { getConnectorSource, useEpisodeSource } from '../../source_labels';
import { EMPTY_VALUE } from '../../constants';
import { isSupportedEpisodeSeverity, normalizeEpisodeSeverity } from '../severity/severity_utils';
import { AlertEpisodeSeverityBadge } from '../severity/episode_severity_badge';
import { AlertEpisodeStatusHealth } from '../status/status_badge';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import { UserProfileDisplay } from '../user_profile_display';
import { CopyableShortId } from '../copyable_short_id';
import { FlappingPopover } from '../flapping/flapping_badge';
import * as flappingI18n from '../flapping/translations';
import { formatMetadataListDuration } from './translations';
import type { AlertEpisodeDetailsServices } from './types';
import * as i18n from './translations';

const interactiveBadgeLabelCss = css`
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
`;

const FlappingBadgeLabel = () => (
  <FlappingPopover
    renderButton={(onClick) => (
      <button
        type="button"
        css={interactiveBadgeLabelCss}
        aria-label={flappingI18n.FLAPPING_BADGE_ARIA_LABEL}
        data-test-subj="alertingV2EpisodeFlyoutFlappingBadgeTrigger"
        onClick={onClick}
      >
        {i18n.FLYOUT_BADGE_FLAPPING}
      </button>
    )}
  />
);

const SnoozedBadgeLabel = ({
  expiry,
  dateFormat,
}: {
  expiry: string | null | undefined;
  dateFormat: string | undefined;
}) => (
  <EuiToolTip
    anchorProps={{ css: { display: 'flex' } }}
    content={
      expiry
        ? i18n.getFlyoutSnoozedUntilTooltip(formatDateTime(expiry, dateFormat))
        : i18n.FLYOUT_SNOOZED_TOOLTIP_UNKNOWN_EXPIRY
    }
  >
    <span tabIndex={0} data-test-subj="alertingV2EpisodeFlyoutSnoozedBadgeTrigger">
      {i18n.FLYOUT_BADGE_SNOOZED}
    </span>
  </EuiToolTip>
);

export interface EpisodeDetailsHeaderBadge {
  id: string;
  label: ReactNode;
  color?: EuiBadgeProps['color'];
  iconType?: IconType;
}

export interface EpisodeDetailsHeaderParts {
  /** When the episode was triggered, formatted with the user's date format. */
  description: string | undefined;
  badges: EpisodeDetailsHeaderBadge[];
  infoBlocks: Array<InfoBlockItem & { id: string }>;
}

export interface UseEpisodeDetailsHeaderPartsOptions {
  episodeId: string;
  sourceId?: string;
  headerData: EpisodeDetailsHeaderData;
  services: Pick<AlertEpisodeDetailsServices, 'uiSettings' | 'userProfile'>;
  actions?: EpisodeAction[];
  onActionSuccess: () => void;
}

/**
 * Builds the badges and info blocks of the episode details header as data, so any flyout
 * can render them with its own components.
 */
export const useEpisodeDetailsHeaderParts = ({
  episodeId,
  sourceId,
  headerData,
  services,
  actions,
  onActionSuccess,
}: UseEpisodeDetailsHeaderPartsOptions): EpisodeDetailsHeaderParts => {
  const {
    isLoading,
    episode,
    status,
    severity,
    episodeAction,
    groupAction,
    isActionStateLoaded,
    isFlapping,
  } = headerData;
  const { label: systemLabel, icon: systemIcon } = useEpisodeSource(sourceId);

  // The actions depend on the action state, so they wait for it to load.
  const episodes = useMemo(
    () => (episode && isActionStateLoaded ? [episode] : []),
    [episode, isActionStateLoaded]
  );
  // The edit assignee action owns its own picker popover, so the header can host it
  // directly instead of routing through the modal that `execute` opens.
  const assigneeInlineControl = useMemo(() => {
    if (!episodes.length) return undefined;
    return actions
      ?.find(
        (action) =>
          action.id === EDIT_EPISODE_ASSIGNEE_ACTION_ID && action.isCompatible({ episodes })
      )
      ?.renderInlineControl?.({ episodes, onSuccess: onActionSuccess, isDisabled: isLoading });
  }, [actions, episodes, onActionSuccess, isLoading]);

  // Alerts ingested from an external connector show that connector (e.g. "zabbix");
  // everything else shows the alerting system (Universal or Classic).
  const connectorSource = getConnectorSource(episode?.source);
  const sourceLabel = connectorSource ?? systemLabel;
  const sourceIcon = connectorSource ? ConnectorIconsMap.get(`.${connectorSource}`) : systemIcon;

  const dateFormat = services.uiSettings.get('dateFormat') ?? undefined;
  const triggeredAt = episode?.triggered_at ?? undefined;
  const description = triggeredAt ? formatDateTime(triggeredAt, dateFormat) : undefined;

  const isAcked = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isResolved = episodeAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;
  const isSnoozed = isEpisodeSnoozed(groupAction?.lastSnoozeAction, groupAction?.snoozedUntil);
  const tags = episodeAction?.tags ?? [];

  const durationMs = episode?.duration;
  const assigneeUid = episodeAction?.lastAssigneeUid ?? undefined;
  const episodeData = parseEpisodeDataJson(episode?.episode_data);
  const rawAlertUrl =
    typeof episodeData.source_alert_url === 'string' && episodeData.source_alert_url.length > 0
      ? episodeData.source_alert_url
      : undefined;
  const alertUrl = rawAlertUrl && /^https?:\/\//i.test(rawAlertUrl) ? rawAlertUrl : undefined;
  const normalizedSeverity = isSupportedEpisodeSeverity(severity)
    ? normalizeEpisodeSeverity(severity)
    : null;

  const badges: EpisodeDetailsHeaderBadge[] = [
    ...(status
      ? [{ id: 'status', color: 'hollow', label: <AlertEpisodeStatusHealth status={status} /> }]
      : []),
    ...(isFlapping
      ? [{ id: 'flapping', color: 'hollow', iconType: 'chartGauge', label: <FlappingBadgeLabel /> }]
      : []),
    ...(isSnoozed
      ? [
          {
            id: 'snoozed',
            iconType: 'bellSlash',
            label: <SnoozedBadgeLabel expiry={groupAction?.snoozedUntil} dateFormat={dateFormat} />,
          },
        ]
      : []),
    ...(isAcked
      ? [{ id: 'acknowledged', iconType: 'checkCircle', label: i18n.FLYOUT_BADGE_ACKNOWLEDGED }]
      : []),
    ...tags.map((tag) => ({ id: `tag-${tag}`, color: 'hollow', label: tag })),
  ];

  const infoBlocks: EpisodeDetailsHeaderParts['infoBlocks'] = [
    {
      // Shortened and copyable. Same treatment as the table's unavailable rule cell.
      id: 'alertId',
      title: i18n.FLYOUT_INFO_BLOCK_ALERT_ID,
      value: (
        <CopyableShortId
          id={episodeId}
          copyTooltip={i18n.getFlyoutCopyAlertIdTooltip(episodeId)}
          copiedTooltip={i18n.FLYOUT_ALERT_ID_COPIED}
          data-test-subj="alertingV2EpisodeFlyoutAlertId"
        />
      ),
    },
    {
      // Which alerting system the alert came from.
      id: 'source',
      title: i18n.FLYOUT_INFO_BLOCK_SOURCE,
      value: (
        <Suspense fallback={null}>
          <EuiBadge
            color="hollow"
            iconType={sourceIcon}
            data-test-subj="alertingV2EpisodeFlyoutSourceBadge"
          >
            {sourceLabel}
          </EuiBadge>
        </Suspense>
      ),
    },
    ...(normalizedSeverity
      ? [
          {
            id: 'severity',
            title: i18n.FLYOUT_INFO_BLOCK_SEVERITY,
            value: (
              <span data-test-subj="alertingV2EpisodeFlyoutSeverity">
                <AlertEpisodeSeverityBadge severity={normalizedSeverity} />
              </span>
            ),
          },
        ]
      : []),
    {
      // The action's control anchors the picker to itself and covers both the assigned and
      // unassigned states, so it replaces the plain cell whenever the action is available.
      id: 'assignee',
      title: i18n.FLYOUT_INFO_BLOCK_ASSIGNEE,
      value: assigneeInlineControl ?? (
        <AlertEpisodeAssigneeCell assigneeUid={assigneeUid} userProfile={services.userProfile} />
      ),
    },
    {
      id: 'duration',
      title: i18n.FLYOUT_INFO_BLOCK_DURATION,
      value: durationMs != null ? formatMetadataListDuration(durationMs) : EMPTY_VALUE,
    },
    ...(alertUrl
      ? [
          {
            id: 'alertUrl',
            title: i18n.METADATA_LIST_SOURCE_URL_LABEL,
            value: (
              <EuiLink
                href={alertUrl}
                target="_blank"
                external
                data-test-subj="alertingV2EpisodeFlyoutAlertUrl"
              >
                {i18n.METADATA_LIST_SOURCE_URL_LINK}
              </EuiLink>
            ),
          },
        ]
      : []),
    ...(isAcked
      ? [
          {
            id: 'acknowledgedBy',
            title: i18n.ACTIONS_OVERVIEW_ACKNOWLEDGED_BY,
            value: (
              <UserProfileDisplay
                userProfileUid={episodeAction?.lastAckActor}
                userProfile={services.userProfile}
              />
            ),
          },
        ]
      : []),
    ...(isResolved
      ? [
          {
            id: 'resolvedBy',
            title: i18n.ACTIONS_OVERVIEW_RESOLVED_BY,
            value: (
              <UserProfileDisplay
                userProfileUid={episodeAction?.lastDeactivateActor}
                userProfile={services.userProfile}
              />
            ),
          },
        ]
      : []),
    ...(isSnoozed
      ? [
          {
            id: 'snoozedBy',
            title: i18n.ACTIONS_OVERVIEW_SNOOZED_BY,
            value: (
              <UserProfileDisplay
                userProfileUid={groupAction?.lastSnoozeActor}
                userProfile={services.userProfile}
              />
            ),
          },
        ]
      : []),
  ];

  return { description, badges, infoBlocks };
};
