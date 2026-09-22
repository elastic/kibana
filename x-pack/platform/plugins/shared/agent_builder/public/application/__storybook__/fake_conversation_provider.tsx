/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { ConversationContext } from '../context/conversation/conversation_context';
import type { ConversationActions } from '../context/conversation/use_conversation_actions';
import { upsertAttachmentsIntoList } from '../context/conversation/upsert_attachments_into_list';
import { removeAttachmentFromList } from '../context/conversation/remove_attachment_from_list';

interface FakeConversationProviderProps {
  children: React.ReactNode;
  conversationId?: string;
  agentId?: string;
  initialAttachments?: ConversationAttachment[];
}

/**
 * Provides a real ConversationContext in Storybook by holding attachment state locally.
 * No hook mocks.
 */
export const FakeConversationProvider: React.FC<FakeConversationProviderProps> = ({
  children,
  conversationId,
  agentId = agentBuilderDefaultAgentId,
  initialAttachments = [],
}) => {
  const [attachments, setAttachments] = useState<ConversationAttachment[]>(initialAttachments);

  const upsertAttachments = useCallback((incoming: ConversationAttachment[]) => {
    setAttachments((prev) => upsertAttachmentsIntoList(prev, incoming));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => removeAttachmentFromList(prev, index));
  }, []);

  const resetAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return (
    <ConversationContext.Provider
      value={{
        isEmbeddedContext: false,
        agentId,
        conversationId,
        conversationActions: {} as ConversationActions,
        attachments,
        upsertAttachments,
        removeAttachment,
        resetAttachments,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
};
