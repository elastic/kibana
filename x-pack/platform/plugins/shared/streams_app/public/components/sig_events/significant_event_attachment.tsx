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
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { SignificantEventAttachment } from '@kbn/streams-plugin/common';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/streams-plugin/common';
import type { ChromeStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../../types';
import type { FocusedSignificantEventService } from '../../services/significant_events/focused_significant_event_service';
import sigEventIcon from '../asset_image/sig_event_icon.svg';
import { registerSignificantEventAutoAttach } from './significant_event_auto_attach';
import { getStatusColor } from './significant_events_discovery/components/sig_events_tab/filter_constants';

const labels = {
  fallback: i18n.translate('xpack.streams.significantEventAttachment.fallbackLabel', {
    defaultMessage: 'Significant event',
  }),
  status: i18n.translate('xpack.streams.significantEventAttachment.statusLabel', {
    defaultMessage: 'Status',
  }),
  impact: i18n.translate('xpack.streams.significantEventAttachment.impactLabel', {
    defaultMessage: 'Impact',
  }),
  criticality: i18n.translate('xpack.streams.significantEventAttachment.criticalityLabel', {
    defaultMessage: 'Criticality',
  }),
  confidence: i18n.translate('xpack.streams.significantEventAttachment.confidenceLabel', {
    defaultMessage: 'Confidence',
  }),
  streams: i18n.translate('xpack.streams.significantEventAttachment.streamsLabel', {
    defaultMessage: 'Streams',
  }),
  summary: i18n.translate('xpack.streams.significantEventAttachment.summaryLabel', {
    defaultMessage: 'Summary',
  }),
  rootCause: i18n.translate('xpack.streams.significantEventAttachment.rootCauseLabel', {
    defaultMessage: 'Root cause',
  }),
  recommendations: i18n.translate('xpack.streams.significantEventAttachment.recommendationsLabel', {
    defaultMessage: 'Recommendations',
  }),
};

const BadgeRow = ({ values }: { values: string[] }) => {
  if (values.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {values.map((value) => (
        <EuiFlexItem grow={false} key={value}>
          <EuiBadge color="hollow">{value}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <EuiText size="xs" color="subdued">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    <EuiText size="s">{children}</EuiText>
  </div>
);

const SignificantEventInlineContent = ({
  attachment,
}: {
  attachment: SignificantEventAttachment;
}) => {
  const { data } = attachment;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={getStatusColor(data.verdict)}>
                {labels.status}: {data.verdict}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {labels.impact}: {data.impact}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {labels.criticality}: {data.criticality}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {labels.confidence}: {data.confidence}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{data.title}</h4>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Field label={labels.summary}>
            <p>{data.summary}</p>
          </Field>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Field label={labels.rootCause}>
            <p>{data.root_cause}</p>
          </Field>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <Field label={labels.streams}>
            <BadgeRow values={data.stream_names} />
          </Field>
        </EuiFlexItem>

        {data.recommendations.length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="xs" />
            <Field label={labels.recommendations}>
              <ul>
                {data.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </Field>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const significantEventAttachmentDefinition: AttachmentUIDefinition<SignificantEventAttachment> =
  {
    getLabel: (attachment) => attachment.data.title || labels.fallback,
    getIcon: () => sigEventIcon,
    getHeader: ({ attachment }) => {
      const badges: HeaderBadge[] = [
        { label: attachment.data.verdict, color: getStatusColor(attachment.data.verdict) },
        { label: attachment.data.impact, color: 'hollow' },
      ];
      return {
        icon: sigEventIcon,
        subtitle: attachment.data.stream_names.join(', '),
        badges,
      };
    },
    renderInlineContent: ({ attachment }) => (
      <SignificantEventInlineContent attachment={attachment} />
    ),
  };

export const registerSignificantEventAttachment = ({
  agentBuilder,
  chrome,
  focusedSignificantEventService,
}: {
  agentBuilder: NonNullable<StreamsAppStartDependencies['agentBuilder']>;
  chrome: ChromeStart;
  focusedSignificantEventService: FocusedSignificantEventService;
}): (() => void) => {
  agentBuilder.attachments.addAttachmentType(
    SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
    significantEventAttachmentDefinition
  );

  return registerSignificantEventAutoAttach({
    agentBuilder,
    chrome,
    focusedSignificantEventService,
  });
};
