/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newConversationId } from './new_conversation';

export const appPaths = {
  root: '/',
  agents: {
    list: '/agents',
    new: '/agents/new',
    edit: ({ agentId }: { agentId: string }) => {
      return `/agents/${agentId}`;
    },
  },
  chat: {
    new: `/conversations/${newConversationId}`,
    conversation: ({ conversationId }: { conversationId: string }) => {
      return `/conversations/${conversationId}`;
    },
  },
  tools: {
    list: '/tools',
  },
};
