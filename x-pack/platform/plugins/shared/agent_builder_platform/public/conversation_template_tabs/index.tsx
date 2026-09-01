/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ConversationTemplateServiceStartContract } from '@kbn/agent-builder-browser';
import { TIMELINE_TAB_ID } from '@kbn/agent-builder-browser';

const TimelinePlaceholder: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilderPlatform.conversationTemplateTabs.timelinePlaceholder', {
        defaultMessage: 'Timeline coming soon.',
      })}
    </p>
  </EuiText>
);

export const registerConversationTemplateTabs = ({
  conversationTemplates,
}: {
  conversationTemplates: ConversationTemplateServiceStartContract;
}): void => {
  conversationTemplates.registerTab(TIMELINE_TAB_ID, {
    label: i18n.translate('xpack.agentBuilderPlatform.conversationTemplateTabs.timelineTabLabel', {
      defaultMessage: 'Timeline',
    }),
    content: TimelinePlaceholder,
  });
};
