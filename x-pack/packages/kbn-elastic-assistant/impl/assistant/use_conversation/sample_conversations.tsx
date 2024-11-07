/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../assistant_context/types';
import { WELCOME_CONVERSATION_TITLE } from './translations';

export const WELCOME_CONVERSATION: Conversation = {
  id: '',
  title: WELCOME_CONVERSATION_TITLE,
  category: 'assistant',
  messages: [],
  replacements: {},
  excludeFromLastConversationStorage: true,
};
