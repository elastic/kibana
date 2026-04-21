/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ComposerInjection } from '../../types/composer';
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
  attachments?: AttachmentInput[];
  upsertAttachments?: (attachments: AttachmentInput[]) => void;
  resetAttachments?: () => void;
  removeAttachment?: (attachmentIndex: number) => void;
  /**
   * Latest composer injection requested by attachment UX; cleared after
   * `ConversationInput` applies it via `acknowledgeComposerInjection`.
   */
  composerInjection?: ComposerInjection | null;
  /**
   * Replace the composer editor content with `text`. The effect re-runs even
   * when `text` is unchanged because a monotonically-increasing `key` is used.
   */
  setComposerContent?: (text: string) => void;
  /**
   * Called by `ConversationInput` once the injection has been applied to the
   * editor. Clears `composerInjection` to `null`.
   */
  acknowledgeComposerInjection?: () => void;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  setConversationId?: (conversationId?: string) => void;
  setAgentId?: (agentId: string) => void;
  conversationActions: ConversationActions;
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
