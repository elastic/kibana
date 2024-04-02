/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation, Message } from '../../assistant_context/types';
import * as i18n from '../../content/prompts/welcome/translations';
import { WELCOME_CONVERSATION_TITLE } from './translations';

export const WELCOME_CONVERSATION: Conversation = {
  id: '',
  title: WELCOME_CONVERSATION_TITLE,
  category: 'assistant',
  messages: [
    {
      role: 'assistant',
      content: i18n.WELCOME_GENERAL,
      timestamp: '',
      presentation: {
        delay: 2 * 1000,
        stream: true,
      },
    },
    {
      role: 'assistant',
      content: i18n.WELCOME_GENERAL_2,
      timestamp: '',
      presentation: {
        delay: 1000,
        stream: true,
      },
    },
    {
      role: 'assistant',
      content: i18n.WELCOME_GENERAL_3,
      timestamp: '',
      presentation: {
        delay: 1000,
        stream: true,
      },
    },
  ],
  replacements: {},
  excludeFromLastConversationStorage: true,
};

export const enterpriseMessaging: Message[] = [
  {
    role: 'assistant',
    content: i18n.ENTERPRISE,
    timestamp: '',
    presentation: {
      delay: 2 * 1000,
      stream: true,
    },
  },
];
