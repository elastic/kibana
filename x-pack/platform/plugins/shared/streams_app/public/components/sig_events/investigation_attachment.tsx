/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import {
  INVESTIGATION_ATTACHMENT_TYPE,
  type InvestigationAttachment,
} from '@kbn/streams-plugin/common';
import type { StreamsAppStartDependencies } from '../../types';
import { InvestigationVisualization } from './significant_events_discovery/components/investigation/investigation_visualization';

const InvestigationInlineContent = ({ attachment }: { attachment: InvestigationAttachment }) => (
  <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
    <InvestigationVisualization investigation={attachment.data} />
  </EuiPanel>
);

export const investigationAttachmentDefinition: AttachmentUIDefinition<InvestigationAttachment> = {
  getLabel: (attachment) =>
    attachment.data.investigation_complete
      ? i18n.translate('xpack.streams.investigationAttachment.labelComplete', {
          defaultMessage: 'Investigation complete',
        })
      : i18n.translate('xpack.streams.investigationAttachment.labelIncomplete', {
          defaultMessage: 'Investigation (incomplete)',
        }),
  getIcon: () => 'inspect',
  getHeader: ({ attachment }) => ({
    icon: 'inspect',
    subtitle: attachment.data.root_cause.slice(0, 80),
    badges: [
      {
        label: i18n.translate('xpack.streams.investigationAttachment.confidenceBadge', {
          defaultMessage: '{pct}% confident',
          values: { pct: Math.round(attachment.data.confidence * 100) },
        }),
        color: attachment.data.confidence >= 0.7 ? 'success' : 'warning',
      },
      ...(attachment.data.investigation_complete
        ? []
        : [
            {
              label: i18n.translate('xpack.streams.investigationAttachment.incompleteBadge', {
                defaultMessage: 'Incomplete',
              }),
              color: 'warning' as const,
            },
          ]),
    ],
  }),
  renderInlineContent: ({ attachment }) => <InvestigationInlineContent attachment={attachment} />,
};

export const registerInvestigationAttachment = ({
  agentBuilder,
}: {
  agentBuilder: NonNullable<StreamsAppStartDependencies['agentBuilder']>;
}) => {
  agentBuilder.attachments.addAttachmentType(
    INVESTIGATION_ATTACHMENT_TYPE,
    investigationAttachmentDefinition
  );
};
