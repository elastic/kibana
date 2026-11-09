/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

type ChatRef = ReturnType<AgentBuilderPluginStart['openChat']>['chatRef'];

let lastChatRef: ChatRef | undefined;

/**
 * Opens a conversation in the Agent Builder sidebar. `openChat` only restores
 * `conversationId` when it mounts the sidebar; when the sidebar is already open
 * it updates props without switching conversation. A sidebar opened from here is
 * closed first, and the reopen waits a tick so the sidebar actually unmounts.
 */
export const openConversationInChat = (
  agentBuilder: Pick<AgentBuilderPluginStart, 'openChat'> | undefined,
  options: { conversationId: string; agentId?: string }
): void => {
  if (!agentBuilder?.openChat) {
    return;
  }
  const open = () => {
    lastChatRef = agentBuilder.openChat(options)?.chatRef;
  };
  if (lastChatRef) {
    lastChatRef.close();
    lastChatRef = undefined;
    setTimeout(open, 0);
    return;
  }
  open();
};
