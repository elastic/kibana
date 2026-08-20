/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { ConversationTemplateTabRenderProps } from '@kbn/agent-builder-browser';
import type { ConversationTemplatesService } from './conversation_templates_service';

const ConversationJson: React.FC<ConversationTemplateTabRenderProps> = ({ conversation }) => (
  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" whiteSpace="pre-wrap">
    {JSON.stringify(conversation, null, 2)}
  </EuiCodeBlock>
);

/**
 * Temporary dev/testing registrations exercising the registry end-to-end — note the
 * `mock-overview` tab registered once and reused by both templates. To be removed once
 * real consumers register their own tabs and template UI definitions.
 */
export const registerMockTemplateUIDefinitions = (
  conversationTemplatesService: ConversationTemplatesService
): void => {
  conversationTemplatesService.registerTab('mock-overview', {
    label: 'Overview',
    content: ConversationJson,
  });

  conversationTemplatesService.registerTab('mock-custom', {
    label: 'Custom 1',
    content: ({ conversation }) => (
      <>
        <p>{'Custom content 1. Full conversation is available'}</p>
        <ConversationJson conversation={conversation} />
      </>
    ),
  });

  conversationTemplatesService.registerTemplateUIDefinition('security-finding', {
    name: 'Security Finding',
    icon: 'warning',
    tabs: ['mock-overview'],
  });

  conversationTemplatesService.registerTemplateUIDefinition('phishing', {
    name: 'Phishing Investigation',
    icon: 'warning',
    tabs: ['mock-overview', 'mock-custom'],
  });
};
