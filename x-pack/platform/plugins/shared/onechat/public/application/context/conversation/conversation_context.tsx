/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/onechat-browser/tools/browser_api_tool';
import type { AttachmentInput, VersionedAttachment } from '@kbn/onechat-common/attachments';
import type { ConversationActions } from './use_conversation_actions';

interface ConversationContextValue {
  conversationId?: string;
  shouldStickToBottom?: boolean;
  isEmbeddedContext: boolean;
  sessionTag?: string;
  agentId?: string;
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  resetInitialMessage?: () => void;
  /** Legacy: Round-level attachments (for backward compat) */
  attachments?: AttachmentInput[];
  resetAttachments?: () => void;
  removeAttachment?: (attachmentIndex: number) => void;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  setConversationId?: (conversationId?: string) => void;
  conversationActions: ConversationActions;
  /** NEW: Conversation-level versioned attachments */
  conversationAttachments?: VersionedAttachment[];
  /** NEW: Delete a conversation-level attachment */
  deleteConversationAttachment?: (attachmentId: string) => void;
  /** NEW: Restore a deleted conversation-level attachment */
  restoreConversationAttachment?: (attachmentId: string) => void;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationContext.Provider');
  }
  return context;
};

export { ConversationContext };
