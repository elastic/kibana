/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  type SignificantEventDetectionAttachment,
} from '../../common';

export const significantEventDetectionAttachmentDefinition: AttachmentUIDefinition<SignificantEventDetectionAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data.rule_name ??
      attachment.data.detection_id ??
      i18n.translate('xpack.significantEvents.detectionAttachment.fallbackLabel', {
        defaultMessage: 'Detection',
      }),
    getIcon: () => 'bell',
    getHeader: () => ({
      icon: 'bell',
      subtitle: i18n.translate('xpack.significantEvents.detectionAttachment.subtitle', {
        defaultMessage: 'Significant Events detection',
      }),
    }),
  };

export const registerSignificantEventDetectionAttachment = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginStart;
}): void => {
  agentBuilder.attachments.addAttachmentType(
    SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
    significantEventDetectionAttachmentDefinition
  );
};
