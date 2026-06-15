/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { SignificantEventAttachment } from '@kbn/streams-plugin/common';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/streams-plugin/common';
import type { StreamsAppStartDependencies } from '../../../types';
import { getStatusColor } from '../significant_events_discovery/utils/event_status_color';
import { SigEventDetails } from '../sig_event_details/sig_event_details';

const labels = {
  fallback: i18n.translate('xpack.streams.significantEventAttachment.fallbackLabel', {
    defaultMessage: 'Significant event',
  }),
  open: i18n.translate('xpack.streams.significantEventAttachment.openButton', {
    defaultMessage: 'Open',
  }),
};

export const significantEventAttachmentDefinition: AttachmentUIDefinition<SignificantEventAttachment> =
  {
    getLabel: (attachment) => attachment.data.title || labels.fallback,
    getIcon: () => 'significantEvent',
    getHeader: ({ attachment }) => ({
      icon: 'significantEvent',
      subtitle: labels.fallback,
      badges: [{ label: attachment.data.verdict, color: getStatusColor(attachment.data.verdict) }],
    }),
    getActionButtons: ({ openCanvas, isCanvas }) => {
      if (isCanvas || !openCanvas) {
        return [];
      }
      return [
        {
          label: labels.open,
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        },
      ];
    },
    renderCanvasContent: ({ attachment }) => (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <SigEventDetails event={attachment.data} />
      </EuiPanel>
    ),
  };

export const registerSignificantEventAttachment = ({
  agentBuilder,
}: {
  agentBuilder: NonNullable<StreamsAppStartDependencies['agentBuilder']>;
}) => {
  agentBuilder.attachments.addAttachmentType(
    SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
    significantEventAttachmentDefinition
  );
};
