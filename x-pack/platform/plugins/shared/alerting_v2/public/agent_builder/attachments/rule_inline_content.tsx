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
import type { RuleAttachment } from './rule_attachment_definition';

export const RuleInlineContent: React.FC<AttachmentRenderProps<RuleAttachment>> = ({
  attachment,
}) => {
  const { data, origin } = attachment;
  const isProposed = !origin;
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getStatusInfo(isProposed, isEnabled);

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusColor}>{status}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{data.kind}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {data.schedule?.every && (
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.alertingV2.ruleAttachment.scheduleEvery', {
                defaultMessage: 'Every {interval}',
                values: { interval: data.schedule.every },
              })}
            </EuiText>
          </EuiFlexItem>
        )}

        {data.metadata.description && (
          <EuiFlexItem>
            <EuiText size="s">{data.metadata.description}</EuiText>
          </EuiFlexItem>
        )}

        {data.metadata.tags && data.metadata.tags.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" wrap>
              {data.metadata.tags.map((tag: string) => (
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

const getStatusInfo = (isProposed: boolean, isEnabled: boolean) => {
  if (isProposed)
    return {
      label: i18n.translate('xpack.alertingV2.ruleAttachment.statusProposed', {
        defaultMessage: 'proposed',
      }),
      color: 'default',
    };

  if (isEnabled)
    return {
      label: i18n.translate('xpack.alertingV2.ruleAttachment.statusEnabled', {
        defaultMessage: 'enabled',
      }),
      color: 'success',
    };

  return {
    label: i18n.translate('xpack.alertingV2.ruleAttachment.statusDisabled', {
      defaultMessage: 'disabled',
    }),
    color: 'warning',
  };
};
