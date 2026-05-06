/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  ALERT_EPISODE_ACTION_TYPE,
  ALERT_EPISODE_STATUS,
  type AlertEpisodeStatus,
} from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
import { AlertEpisodeStatusBadge } from './status_badge';

// Flex anchor avoids inline line-height missizing
const tooltipAnchorProps = { css: { display: 'flex' } };

export interface AlertEpisodeStatusBadgesProps {
  status: AlertEpisodeStatus;
  episodeAction?: EpisodeActionState;
  groupAction?: AlertEpisodeGroupAction;
}

export function AlertEpisodeStatusBadges({
  status,
  episodeAction,
  groupAction,
}: AlertEpisodeStatusBadgesProps) {
  const isAcknowledged = episodeAction?.lastAckAction === ALERT_EPISODE_ACTION_TYPE.ACK;
  const isSnoozed = groupAction?.lastSnoozeAction === ALERT_EPISODE_ACTION_TYPE.SNOOZE;

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
            groupAction?.lastDeactivateAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE
              ? ALERT_EPISODE_STATUS.INACTIVE
              : status
          }
        />
      </EuiFlexItem>
      {isSnoozed && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            anchorProps={tooltipAnchorProps}
            content={
              groupAction?.snoozeExpiry ? (
                <FormattedMessage
                  id="xpack.alertingV2EpisodesUi.snoozedUntilTooltip"
                  defaultMessage="Notifications snoozed until {expiry}."
                  values={{
                    expiry: (
                      <FormattedDate
                        value={new Date(groupAction.snoozeExpiry)}
                        year="numeric"
                        month="short"
                        day="numeric"
                        hour="numeric"
                        minute="2-digit"
                      />
                    ),
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.alertingV2EpisodesUi.snoozedTooltipUnknownExpiry"
                  defaultMessage="Notifications are snoozed."
                />
              )
            }
          >
            <EuiBadge
              tabIndex={0}
              iconType="bellSlash"
              data-test-subj="alertEpisodeStatusCellSnoozeIndicator"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {isAcknowledged && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            anchorProps={tooltipAnchorProps}
            content={
              <FormattedMessage
                id="xpack.alertingV2EpisodesUi.acknowledgedTooltip"
                defaultMessage="This alert is acknowledged."
              />
            }
          >
            <EuiBadge
              tabIndex={0}
              iconType="checkCircle"
              aria-label={i18n.translate('xpack.alertingV2EpisodesUi.acknowledgedBadgeAriaLabel', {
                defaultMessage: 'Acknowledged',
              })}
              data-test-subj="alertEpisodeStatusCellAckIndicator"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
