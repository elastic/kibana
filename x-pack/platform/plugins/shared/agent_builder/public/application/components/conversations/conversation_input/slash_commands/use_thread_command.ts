/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ConversationParentRelation } from '@kbn/agent-builder-common';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../../hooks/use_conversation';
import { useCreateThread } from '../../../../hooks/use_create_thread';
import type { SlashCommand } from './types';

const threadCommandDescription = i18n.translate(
  'xpack.agentBuilder.conversationInput.slashCommands.thread.description',
  { defaultMessage: 'Start new sub-conversation' }
);

const noConversationMessage = i18n.translate(
  'xpack.agentBuilder.conversationInput.slashCommands.thread.noConversation',
  {
    defaultMessage:
      'A thread starts from an existing conversation. Send a message first, then start a thread.',
  }
);

const alreadyThreadMessage = i18n.translate(
  'xpack.agentBuilder.conversationInput.slashCommands.thread.alreadyThread',
  {
    defaultMessage:
      "You can't start a thread inside a thread. Go back to the parent conversation to start one.",
  }
);

/**
 * The `/thread` command. Starts a thread of the current conversation, seeded with the text typed
 * after the command, or empty when there is none.
 */
export const useThreadCommand = (): SlashCommand => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const { mutateAsync: createThread } = useCreateThread();

  const isThread =
    conversation?.parent_conversation?.relation === ConversationParentRelation.thread;
  const unavailableReason = !conversationId
    ? noConversationMessage
    : isThread
    ? alreadyThreadMessage
    : undefined;

  return useMemo(
    () => ({
      name: 'thread',
      description: threadCommandDescription,
      iconType: 'comment',
      unavailableReason,
      run: async (args: string) => {
        const highlightText = args.trim();
        await createThread(highlightText ? { highlightText } : {});
      },
    }),
    [unavailableReason, createThread]
  );
};
