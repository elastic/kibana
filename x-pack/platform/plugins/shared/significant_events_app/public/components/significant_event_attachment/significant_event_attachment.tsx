/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toSignificantEventAttachmentViewSpec } from '@kbn/adaptive-ui-adapters';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { SignificantEventAttachment } from '@kbn/significant-events-plugin/common';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import type { ChromeStart } from '@kbn/core/public';

import type { SignificantEventsAppStartDependencies } from '../../types';
import { getSignificantEventStatusColor } from '../../pages/significant_events/components/shared/status_display';
import { SIGNIFICANT_EVENT_STATUS_LABELS } from '../../pages/significant_events/components/shared/translations';
import { SignificantEventDetails } from '../significant_event_details/significant_event_details';
import type { FocusedSignificantEventService } from '../../services/focused_significant_event_service';
import { registerSignificantEventAutoAttach } from '../../lib/significant_event_auto_attach';

const labels = {
  fallback: i18n.translate('xpack.significantEventsApp.significantEventAttachment.fallbackLabel', {
    defaultMessage: 'Significant event',
  }),
  open: i18n.translate('xpack.significantEventsApp.significantEventAttachment.openButton', {
    defaultMessage: 'Open preview',
  }),
};

export const significantEventAttachmentDefinition: AttachmentUIDefinition<SignificantEventAttachment> =
  {
    getLabel: (attachment) => attachment.data.title || labels.fallback,
    getIcon: () => 'significantEvents',
    getHeader: ({ attachment }) => ({
      icon: 'significantEvents',
      subtitle: labels.fallback,
      badges: [
        {
          label: SIGNIFICANT_EVENT_STATUS_LABELS[attachment.data.status] ?? attachment.data.status,
          color: getSignificantEventStatusColor(attachment.data.status),
        },
      ],
    }),
    getActionButtons: ({ openCanvas, isCanvas }) => {
      if (isCanvas || !openCanvas) {
        return [];
      }
      return [
        {
          label: labels.open,
          type: ActionButtonType.SECONDARY,
          icon: 'eye',
          handler: openCanvas,
        },
      ];
    },
    getViewSpec: ({ data }) => toSignificantEventAttachmentViewSpec(data),
    renderCanvasContent: ({ attachment }) => (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <SignificantEventDetails event={attachment.data} />
      </EuiPanel>
    ),
  };

export const registerSignificantEventAttachment = ({
  agentBuilder,
  chrome,
  focusedSignificantEventService,
}: {
  agentBuilder: NonNullable<SignificantEventsAppStartDependencies['agentBuilder']>;
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
