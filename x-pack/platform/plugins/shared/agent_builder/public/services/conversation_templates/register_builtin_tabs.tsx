/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ConversationTemplatesService } from './conversation_templates_service';

export const ATTACHMENTS_TAB_ID = 'attachments';
export const TIMELINE_TAB_ID = 'timeline';

/**
 * Agent Builder's own tabs, always appended to the conversation metadata flyout after
 * the template's tabs.
 */
export const BUILTIN_TAB_IDS: readonly string[] = [ATTACHMENTS_TAB_ID, TIMELINE_TAB_ID];

const AttachmentsPlaceholder: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.attachmentsPlaceholder', {
        defaultMessage: 'Attachments coming soon.',
      })}
    </p>
  </EuiText>
);

const TimelinePlaceholder: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.timelinePlaceholder', {
        defaultMessage: 'Timeline coming soon.',
      })}
    </p>
  </EuiText>
);

export const registerBuiltinTabs = (
  conversationTemplatesService: ConversationTemplatesService
): void => {
  conversationTemplatesService.registerTab(ATTACHMENTS_TAB_ID, {
    label: i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.attachmentsTabLabel', {
      defaultMessage: 'Attachments',
    }),
    content: AttachmentsPlaceholder,
  });

  conversationTemplatesService.registerTab(TIMELINE_TAB_ID, {
    label: i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.timelineTabLabel', {
      defaultMessage: 'Timeline',
    }),
    content: TimelinePlaceholder,
  });
};
