/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { AlertEpisodeStatusBadge } from '@kbn/alerting-v2-episodes-ui/components/status/status_badge';
import { i18n } from '@kbn/i18n';
import type { EpisodeAttachment } from './episode_attachment_definition';

export const EpisodeInlineContent: React.FC<AttachmentRenderProps<EpisodeAttachment>> = ({
  attachment,
}) => {
  const { data } = attachment;

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <AlertEpisodeStatusBadge status={data['episode.status']} />
            </EuiFlexItem>
            {data.severity && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{data.severity}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.episodeAttachment.ruleId', {
              defaultMessage: 'Rule: {ruleId}',
              values: { ruleId: data['rule.id'] },
            })}
          </EuiText>
        </EuiFlexItem>

        {data.last_tags && data.last_tags.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" wrap>
              {data.last_tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="default">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
