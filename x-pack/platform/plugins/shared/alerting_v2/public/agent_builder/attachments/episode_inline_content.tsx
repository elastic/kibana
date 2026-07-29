/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import type { EpisodeAttachment } from './episode_attachment_definition';

const STATUS_COLORS: Record<string, string> = {
  active: 'danger',
  pending: 'warning',
  recovering: 'primary',
  inactive: 'default',
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

export const EpisodeInlineContent: React.FC<AttachmentRenderProps<EpisodeAttachment>> = ({
  attachment,
}) => {
  const { data } = attachment;
  const statusColor = STATUS_COLORS[data.episode_status] ?? 'default';

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusColor}>{data.episode_status}</EuiBadge>
            </EuiFlexItem>
            {data.severity && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{data.severity}</EuiBadge>
              </EuiFlexItem>
            )}
            {data.last_ack_action === 'ack' && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.alertingV2.episodeAttachment.acknowledged', {
                    defaultMessage: 'Acknowledged',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {data.last_snooze_action === 'snooze' && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate('xpack.alertingV2.episodeAttachment.snoozed', {
                    defaultMessage: 'Snoozed',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.episodeAttachment.duration', {
              defaultMessage: 'Duration: {duration}',
              values: { duration: formatDuration(data.duration) },
            })}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.episodeAttachment.ruleId', {
              defaultMessage: 'Rule: {ruleId}',
              values: { ruleId: data.rule_id },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
