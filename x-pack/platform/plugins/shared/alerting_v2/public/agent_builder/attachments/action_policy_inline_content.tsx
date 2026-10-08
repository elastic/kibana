/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { i18n } from '@kbn/i18n';
import {
  POLICY_SCOPE_LABEL,
  PolicyScopeSummary,
} from '../../components/action_policy/details_flyout/policy_scope_summary';
import {
  DISPATCH_PER_LABEL,
  FREQUENCY_LABEL,
  getFrequencyLabel,
  getGroupingModeLabel,
} from '../../components/action_policy/labels';
import { AttachmentInfoBar } from './attachment_info_bar';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';

export const ActionPolicyInlineContent: React.FC<AttachmentRenderProps<ActionPolicyAttachment>> = ({
  attachment,
}) => {
  const { euiTheme } = useEuiTheme();
  const { data, origin } = attachment;
  const isDraft = !origin;
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getStatusInfo(isDraft, isEnabled);

  const destinationCount = data.destinations?.length ?? 0;

  const containerCss = css`
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false} css={containerCss}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h5>{POLICY_SCOPE_LABEL}</h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PolicyScopeSummary matcher={data.matcher} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AttachmentInfoBar
          items={[
            {
              title: i18n.translate('xpack.alertingV2.actionPolicyAttachment.status', {
                defaultMessage: 'Status',
              }),
              content: <EuiBadge color={statusColor}>{status}</EuiBadge>,
              'data-test-subj': 'actionPolicyInlineStatus',
            },
            {
              title: DISPATCH_PER_LABEL,
              content: (
                <EuiText size="xs">
                  <strong>{getGroupingModeLabel(data.grouping_mode)}</strong>
                </EuiText>
              ),
              'data-test-subj': 'actionPolicyInlineDispatchPer',
            },
            {
              title: FREQUENCY_LABEL,
              content: (
                <EuiText size="xs">
                  <strong>{getFrequencyLabel(data.throttle, data.grouping_mode)}</strong>
                </EuiText>
              ),
              'data-test-subj': 'actionPolicyInlineFrequency',
            },
            {
              title: i18n.translate('xpack.alertingV2.actionPolicyAttachment.destination', {
                defaultMessage: 'Destination',
              }),
              content: (
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.alertingV2.actionPolicyAttachment.workflowCount', {
                      defaultMessage: '{count, plural, one {# workflow} other {# workflows}}',
                      values: { count: destinationCount },
                    })}
                  </strong>
                </EuiText>
              ),
              'data-test-subj': 'actionPolicyInlineDestination',
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getStatusInfo = (isDraft: boolean, isEnabled: boolean) => {
  if (isDraft)
    return {
      label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusDraft', {
        defaultMessage: 'Draft',
      }),
      color: 'default',
    };

  if (isEnabled)
    return {
      label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusEnabled', {
        defaultMessage: 'Enabled',
      }),
      color: 'success',
    };

  return {
    label: i18n.translate('xpack.alertingV2.actionPolicyAttachment.statusDisabled', {
      defaultMessage: 'Disabled',
    }),
    color: 'warning',
  };
};
