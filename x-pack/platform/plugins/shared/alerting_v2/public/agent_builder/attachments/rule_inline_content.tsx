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
import { formatDuration } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { BadgeList } from '../../components/action_policy/badge_list';
import { RuleKindBadge } from '../../components/rule_details/rule_summary_header';
import { AttachmentInfoBar } from './attachment_info_bar';
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
        <AttachmentInfoBar
          items={[
            {
              title: i18n.translate('xpack.alertingV2.ruleAttachment.outcome', {
                defaultMessage: 'Outcome',
              }),
              content: <RuleKindBadge kind={data.kind} />,
              'data-test-subj': 'ruleInlineOutcome',
            },
            {
              title: i18n.translate('xpack.alertingV2.ruleAttachment.status', {
                defaultMessage: 'Status',
              }),
              content: <EuiBadge color={statusColor}>{status}</EuiBadge>,
              'data-test-subj': 'ruleInlineStatus',
            },
            {
              title: i18n.translate('xpack.alertingV2.ruleAttachment.schedule', {
                defaultMessage: 'Schedule',
              }),
              content: data.schedule?.every ? (
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.alertingV2.ruleAttachment.scheduleEvery', {
                      defaultMessage: 'Every {interval}',
                      values: { interval: formatScheduleInterval(data.schedule.every) },
                    })}
                  </strong>
                </EuiText>
              ) : null,
              'data-test-subj': 'ruleInlineSchedule',
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// `formatDuration` throws on units it does not handle (e.g. `ms`, `w`); fall back to the raw value.
const formatScheduleInterval = (interval: string): string => {
  try {
    return formatDuration(interval);
  } catch {
    return interval;
  }
};

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
