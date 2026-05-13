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
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';

export const ActionPolicyInlineContent: React.FC<
  AttachmentRenderProps<ActionPolicyAttachment>
> = ({ attachment }) => {
  const { data, origin: savedObjectId } = attachment;
  const isProposed = !savedObjectId;
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getStatusInfo(isProposed, isEnabled);

  const matcherSummary = data.matcher
    ? data.matcher
    : i18n.translate('xpack.alertingV2.actionPolicyAttachment.matchesAll', {
        defaultMessage: 'matches all',
      });

  const destinationCount = data.destinations?.length ?? 0;

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusColor}>{status}</EuiBadge>
            </EuiFlexItem>
            {data.throttle?.strategy && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{data.throttle.strategy}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.actionPolicyAttachment.matcherSummary', {
              defaultMessage: 'Matcher: {matcher}',
              values: { matcher: matcherSummary },
            })}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.actionPolicyAttachment.destinationCount', {
              defaultMessage:
                '{count, plural, one {# destination} other {# destinations}}',
              values: { count: destinationCount },
            })}
          </EuiText>
        </EuiFlexItem>

        {data.tags && data.tags.length > 0 && (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" wrap>
              {data.tags.map((tag: string) => (
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
      label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusProposed', {
        defaultMessage: 'proposed',
      }),
      color: 'default',
    };

  if (isEnabled)
    return {
      label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusEnabled', {
        defaultMessage: 'enabled',
      }),
      color: 'success',
    };

  return {
    label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusDisabled', {
      defaultMessage: 'disabled',
    }),
    color: 'warning',
  };
};
