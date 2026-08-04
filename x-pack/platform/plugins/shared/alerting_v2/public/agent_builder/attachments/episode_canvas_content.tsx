/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { AlertEpisodeStatusBadge } from '@kbn/alerting-v2-episodes-ui/components/status/status_badge';
import { i18n } from '@kbn/i18n';
import type { EpisodeAttachment } from './episode_attachment_definition';

export const EpisodeCanvasContent: React.FC<AttachmentRenderProps<EpisodeAttachment>> = ({
  attachment,
}) => {
  const { data } = attachment;

  const items = [
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.episodeId', {
        defaultMessage: 'Episode ID',
      }),
      description: data['episode.id'],
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.ruleId', {
        defaultMessage: 'Rule ID',
      }),
      description: data['rule.id'],
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.groupHash', {
        defaultMessage: 'Group hash',
      }),
      description: data.group_hash,
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.firstSeen', {
        defaultMessage: 'First seen',
      }),
      description: data.first_timestamp,
    },
    {
      title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.lastSeen', {
        defaultMessage: 'Last seen',
      }),
      description: data.last_timestamp,
    },
    ...(data.severity
      ? [
          {
            title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.severity', {
              defaultMessage: 'Severity',
            }),
            description: data.severity,
          },
        ]
      : []),
    ...(data.last_tags?.length
      ? [
          {
            title: i18n.translate('xpack.alertingV2.episodeAttachment.canvas.tags', {
              defaultMessage: 'Tags',
            }),
            description: data.last_tags.join(', '),
          },
        ]
      : []),
  ];

  return (
    <EuiPanel paddingSize="l" hasShadow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.alertingV2.episodeAttachment.canvas.title', {
                defaultMessage: 'Alert episode',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlertEpisodeStatusBadge status={data['episode.status']} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiDescriptionList listItems={items} type="column" compressed />
    </EuiPanel>
  );
};
