/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationTemplatesService } from './conversation_templates_service';

const ConversationJson: React.FC<{ conversation: Conversation }> = ({ conversation }) => (
  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" whiteSpace="pre-wrap">
    {JSON.stringify(conversation, null, 2)}
  </EuiCodeBlock>
);

/**
 * Temporary dev/testing registrations exercising the registry end-to-end. To be removed once
 * real consumers (e.g. security solution) register their own template UI definitions.
 */
export const registerMockTemplateUIDefinitions = (
  conversationTemplatesService: ConversationTemplatesService
): void => {
  conversationTemplatesService.addTemplateUIDefinition('security-finding', {
    tabs: [
      {
        tab: 'overview',
        label: 'Overview',
        content: ConversationJson,
      },
    ],
  });

  conversationTemplatesService.addTemplateUIDefinition('phishing', {
    tabs: [
      {
        tab: 'overview',
        label: 'Overview',
        content: ConversationJson,
      },
      {
        tab: 'custom-1',
        label: 'Custom 1',
        content: ({ conversation }) => (
          <>
            <p>{'Custom content 1. Full conversation is available'}</p>
            <ConversationJson conversation={conversation} />
          </>
        ),
      },
    ],
  });
};
