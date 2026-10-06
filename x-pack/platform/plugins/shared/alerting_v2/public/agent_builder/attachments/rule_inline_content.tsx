/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { BadgeList } from '../../components/action_policy/badge_list';
import { RuleKindBadge } from '../../components/rule_details/rule_summary_header';
import type { RuleAttachment } from './rule_attachment_definition';

export const RuleInlineContent: React.FC<AttachmentRenderProps<RuleAttachment>> = ({
  attachment,
}) => {
  const { euiTheme } = useEuiTheme();
  const { data, origin: savedObjectId } = attachment;
  const isDraft = !savedObjectId;
  const isEnabled = data.enabled ?? true;
  const { label: status, color: statusColor } = getStatusInfo(isDraft, isEnabled);
  const { description, tags } = data.metadata;

  const containerCss = css`
    padding: ${euiTheme.size.m};
  `;

  const infoItemCss = css`
    flex: 1;
    min-width: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    &:not(:first-of-type) {
      border-left: ${euiTheme.border.thin};
    }
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false} css={containerCss}>
      {(description || (tags && tags.length > 0)) && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>
                  {i18n.translate('xpack.alertingV2.ruleAttachment.description', {
                    defaultMessage: 'Description',
                  })}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            {description && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">{description}</EuiText>
              </EuiFlexItem>
            )}
            {tags && tags.length > 0 && (
              <EuiFlexItem grow={false}>
                <BadgeList items={tags} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            <EuiFlexItem css={infoItemCss} data-test-subj="ruleInlineOutcome">
              <InfoItem
                title={i18n.translate('xpack.alertingV2.ruleAttachment.outcome', {
                  defaultMessage: 'Outcome',
                })}
              >
                <RuleKindBadge kind={data.kind} />
              </InfoItem>
            </EuiFlexItem>
            <EuiFlexItem css={infoItemCss} data-test-subj="ruleInlineStatus">
              <InfoItem
                title={i18n.translate('xpack.alertingV2.ruleAttachment.status', {
                  defaultMessage: 'Status',
                })}
              >
                <EuiBadge color={statusColor}>{status}</EuiBadge>
              </InfoItem>
            </EuiFlexItem>
            <EuiFlexItem css={infoItemCss} data-test-subj="ruleInlineSchedule">
              <InfoItem
                title={i18n.translate('xpack.alertingV2.ruleAttachment.schedule', {
                  defaultMessage: 'Schedule',
                })}
              >
                {data.schedule?.every && (
                  <EuiText size="xs">
                    <strong>
                      {i18n.translate('xpack.alertingV2.ruleAttachment.scheduleEvery', {
                        defaultMessage: 'Every {interval}',
                        values: { interval: formatDuration(data.schedule.every) },
                      })}
                    </strong>
                  </EuiText>
                )}
              </InfoItem>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const InfoItem: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {title}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{children}</EuiFlexItem>
  </EuiFlexGroup>
);

const getStatusInfo = (isDraft: boolean, isEnabled: boolean) => {
  if (isDraft)
    return {
      label: i18n.translate('xpack.alertingV2.ruleAttachment.statusDraft', {
        defaultMessage: 'Draft',
      }),
      color: 'default',
    };

  if (isEnabled)
    return {
      label: i18n.translate('xpack.alertingV2.ruleAttachment.statusEnabled', {
        defaultMessage: 'Enabled',
      }),
      color: 'success',
    };

  return {
    label: i18n.translate('xpack.alertingV2.ruleAttachment.statusDisabled', {
      defaultMessage: 'Disabled',
    }),
    color: 'warning',
  };
};
