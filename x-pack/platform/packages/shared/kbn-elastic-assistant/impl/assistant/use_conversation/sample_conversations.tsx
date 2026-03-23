/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '../../assistant_context/types';
import { WELCOME_CONVERSATION_TITLE } from './translations';
export const MOCK_CURRENT_USER = { id: '123', name: 'elastic' };
export const MOCK_USER_PROFILE = {
  data: {},
  enabled: true,
  uid: 'u_SIqviHw6akpDTNddWASJ4aylPSWusCGHlsXCoBkNo_Q_0',
  user: {
    email: 'test_vernie_borer@elastic.co',
    full_name: 'Vernie Borer',
    username: 'test_vernie_borer',
  },
};
export const WELCOME_CONVERSATION: Conversation = {
  id: '',
  title: WELCOME_CONVERSATION_TITLE,
  category: 'assistant',
  messages: [],
  replacements: {},
  excludeFromLastConversationStorage: true,
  createdBy: MOCK_CURRENT_USER,
  users: [MOCK_CURRENT_USER],
  createdAt: '2025-08-06T17:33:12.110Z',
};
