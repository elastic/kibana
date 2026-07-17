/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPublicPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  SIGNIFICANT_EVENT_FEATURE_ATTACHMENT_TYPE,
  type SignificantEventFeatureAttachment,
} from '../../common';

export const significantEventFeatureAttachmentDefinition: AttachmentUIDefinition<SignificantEventFeatureAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data.title ??
      attachment.data.id ??
      i18n.translate('xpack.significantEvents.featureAttachment.fallbackLabel', {
        defaultMessage: 'Entity',
      }),
    getIcon: () => 'node',
    getHeader: () => ({
      icon: 'node',
      subtitle: i18n.translate('xpack.significantEvents.featureAttachment.subtitle', {
        defaultMessage: 'Knowledge indicator feature',
      }),
    }),
  };

export const registerSignificantEventFeatureAttachment = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPublicPluginStart;
}): void => {
  agentBuilder.attachments.addAttachmentType(
    SIGNIFICANT_EVENT_FEATURE_ATTACHMENT_TYPE,
    significantEventFeatureAttachmentDefinition
  );
};
