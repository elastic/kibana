/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation, Message } from '../../assistant_context/types';
import * as i18n from '../../content/prompts/welcome/translations';
import {
  ELASTIC_AI_ASSISTANT,
  ELASTIC_AI_ASSISTANT_TITLE,
  WELCOME_CONVERSATION_TITLE,
} from './translations';

export const WELCOME_CONVERSATION: Conversation = {
  id: WELCOME_CONVERSATION_TITLE,
  theme: {
    title: ELASTIC_AI_ASSISTANT_TITLE,
    titleIcon: 'logoSecurity',
    assistant: {
      name: ELASTIC_AI_ASSISTANT,
      icon: 'logoSecurity',
    },
    system: {
      icon: 'logoElastic',
    },
    user: {},
  },
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
  apiConfig: {},
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
