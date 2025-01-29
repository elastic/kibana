/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import moment from 'moment';

import type { Agent } from '../../../../types';
import type { AgentUpgradeDetails } from '../../../../../../../common/types';
import {
  getNotUpgradeableMessage,
  isAgentUpgradeAvailable,
} from '../../../../../../../common/services';

/**
 * Returns a user-friendly string for the estimated remaining time until the upgrade is scheduled.
 */
export function getUpgradeStartDelay(scheduledAt?: string): string {
  const timeDiffMillis = Date.parse(scheduledAt || '') - Date.now();

  if (timeDiffMillis < 0) {
    // The scheduled time should not be in the past, this would indicate an issue.
    // We choose not to provide a time estimation rather than negative duration.
    return '';
  }

  if (timeDiffMillis < 15 * 6e4) {
    return ' The upgrade will start in less than 15 minutes.';
  }
  if (timeDiffMillis < 30 * 6e4) {
    return ' The upgrade will start in less than 30 minutes.';
  }
  if (timeDiffMillis < 60 * 6e4) {
    return ' The upgrade will start in less than 1 hour.';
  }
  return ` The upgrade will start in less than ${Math.ceil(timeDiffMillis / 36e5)} hours.`;
}

export function getDownloadEstimate(metadata?: AgentUpgradeDetails['metadata']): string {
  if (
    !metadata ||
    (metadata.download_percent === undefined && metadata.download_rate === undefined)
  ) {
    return '';
  }
  let tooltip = '';
  if (metadata.download_percent !== undefined) {
    tooltip = `${metadata.download_percent}%`;
  }
  if (metadata.download_rate !== undefined) {
    tooltip += ` at ${formatRate(metadata.download_rate)}`;
  }

  return ` (${tooltip.trim()})`;
}

const formatRate = (downloadRate: number) => {
  let i = 0;
  const byteUnits = [' Bps', ' kBps', ' MBps', ' GBps'];
  for (; i < byteUnits.length - 1; i++) {
    if (downloadRate < 1024) break;
    downloadRate = downloadRate / 1024;
  }
  return downloadRate.toFixed(1) + byteUnits[i];
};
const formatRetryUntil = (retryUntil: string | undefined) => {
  if (!retryUntil) return '';
  const eta = new Date(retryUntil).toISOString();
  const remainingTime = Date.parse(retryUntil) - Date.now();
  const duration = moment
    .utc(moment.duration(remainingTime, 'milliseconds').asMilliseconds())
    .format('HH:mm');

  return remainingTime > 0 ? `Retrying until: ${eta} (${duration} remaining)` : '';
};

function getStatusComponents(agentUpgradeDetails?: AgentUpgradeDetails) {
  switch (agentUpgradeDetails?.state) {
    case 'UPG_REQUESTED':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="calendar">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRequested"
              defaultMessage="Upgrade requested"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRequested"
            defaultMessage="The agent has requested an upgrade."
          />
        ),
      };
    case 'UPG_SCHEDULED':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="clock">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeScheduled"
              defaultMessage="Upgrade scheduled"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeScheduled"
            defaultMessage="The agent has been instructed to upgrade.{upgradeStartDelay}"
            values={{
              upgradeStartDelay: getUpgradeStartDelay(agentUpgradeDetails.metadata?.scheduled_at),
            }}
          />
        ),
      };
    case 'UPG_DOWNLOADING':
      if (agentUpgradeDetails?.metadata?.retry_error_msg) {
        return {
          Badge: (
            <EuiBadge color="accent" iconType="download">
              <FormattedMessage
                id="xpack.fleet.agentUpgradeStatusBadge.upgradeDownloading"
                defaultMessage="Upgrade downloading"
              />
            </EuiBadge>
          ),
          WarningTooltipText: (
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDownloadingFailed"
              defaultMessage="Upgrade failing: {retryMsg}. {retryUntil}"
              values={{
                retryMsg: agentUpgradeDetails?.metadata?.retry_error_msg,
                retryUntil: formatRetryUntil(agentUpgradeDetails?.metadata?.retry_until),
              }}
            />
          ),
        };
      }
      return {
        Badge: (
          <EuiBadge color="accent" iconType="download">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeDownloading"
              defaultMessage="Upgrade downloading"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDownloading"
            defaultMessage="Downloading the new agent artifact version{downloadEstimate}."
            values={{
              downloadEstimate: getDownloadEstimate(agentUpgradeDetails?.metadata),
            }}
          />
        ),
      };
    case 'UPG_EXTRACTING':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="package">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeExtracting"
              defaultMessage="Upgrade extracting"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeExtracting"
            defaultMessage="The new agent artifact is extracting."
          />
        ),
      };
    case 'UPG_REPLACING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="copy">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeReplacing"
              defaultMessage="Upgrade replacing"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeReplacing"
            defaultMessage="Replacing the agent artifact version."
          />
        ),
      };
    case 'UPG_RESTARTING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="refresh">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRestarting"
              defaultMessage="Upgrade restarting"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRestarting"
            defaultMessage="The agent is restarting to apply the update."
          />
        ),
      };
    case 'UPG_WATCHING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="inspect">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeMonitoring"
              defaultMessage="Upgrade monitoring"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeMonitoring"
            defaultMessage="Monitoring the new agent version for errors."
          />
        ),
      };
    case 'UPG_ROLLBACK':
      return {
        Badge: (
          <EuiBadge color="danger" iconType="returnKey">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRolledBack"
              defaultMessage="Upgrade rolled back"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRolledBack"
            defaultMessage="Upgrade unsuccessful. Rolling back to previous version."
          />
        ),
      };
    case 'UPG_FAILED':
      return {
        Badge: (
          <EuiBadge color="danger" iconType="error">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeFailed"
              defaultMessage="Upgrade failed"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeFailed"
            defaultMessage="Upgrade failed: {errorMsg}."
            values={{
              errorMsg: agentUpgradeDetails?.metadata?.error_msg,
            }}
          />
        ),
      };
    default:
      return null;
  }
}

export const AgentUpgradeStatus: React.FC<{
  isAgentUpgradable: boolean;
  agent: Agent;
  latestAgentVersion?: string;
}> = ({ isAgentUpgradable, agent, latestAgentVersion }) => {
  const isAgentUpgrading = useMemo(
    () => agent.upgrade_started_at && !agent.upgraded_at,
    [agent.upgrade_started_at, agent.upgraded_at]
  );
  const status = useMemo(() => getStatusComponents(agent.upgrade_details), [agent.upgrade_details]);
  const minVersion = '8.12';
  const notUpgradeableMessage = getNotUpgradeableMessage(agent, latestAgentVersion);

  if (isAgentUpgradable && isAgentUpgradeAvailable(agent, latestAgentVersion)) {
    return (
      <EuiBadge color="hollow" iconType="sortUp">
        <FormattedMessage
          id="xpack.fleet.agentUpgradeStatusBadge.upgradeAvailable"
          defaultMessage="Upgrade available"
        />
      </EuiBadge>
    );
  }

  if (agent.upgrade_details && status) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{status.Badge}</EuiFlexItem>
        {status.TooltipText && (
          <EuiFlexItem grow={false}>
            <EuiIconTip type="iInCircle" content={status.TooltipText} color="subdued" />
          </EuiFlexItem>
        )}
        {status.WarningTooltipText && (
          <EuiFlexItem grow={false}>
            <EuiIconTip type="warning" content={status.WarningTooltipText} color="warning" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  if (isAgentUpgrading) {
    return (
      <EuiIconTip
        type="iInCircle"
        content={
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDetailsNotAvailable"
            defaultMessage="Detailed upgrade status is available for Elastic Agents on version {minVersion} and higher."
            values={{
              minVersion,
            }}
          />
        }
        color="subdued"
      />
    );
  }

  if (!isAgentUpgradable && notUpgradeableMessage) {
    return (
      <EuiIconTip
        type="iInCircle"
        content={
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusBadge.notUpgradeable"
            defaultMessage="Agent not upgradeable: {reason}"
            values={{
              reason: notUpgradeableMessage,
            }}
          />
        }
        color="subdued"
      />
    );
  }

  return null;
};
