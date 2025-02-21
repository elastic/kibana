/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiConfig, Message, Replacements } from '@kbn/elastic-assistant-common';
import { EuiCommentProps } from '@elastic/eui';
import { UserAvatar } from '.';

export interface MessagePresentation {
  delay?: number;
  stream?: boolean;
}

// The ClientMessage is different from the Message in that it content
// can be undefined and reader is the correct type which is unavailable in Zod
export interface ClientMessage extends Omit<Message, 'content' | 'reader'> {
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  content?: string;
  presentation?: MessagePresentation;
}
/**
 * Complete state to reconstruct a conversation instance.
 * Includes all messages, connector configured, and relevant UI state.
 *
 */
export interface Conversation {
  '@timestamp'?: string;
  apiConfig?: ApiConfig;
  user?: {
    id?: string;
    name?: string;
  };
  category: string;
  id: string;
  title: string;
  messages: ClientMessage[];
  updatedAt?: Date;
  createdAt?: Date;
  replacements: Replacements;
  isDefault?: boolean;
  excludeFromLastConversationStorage?: boolean;
}

export interface AssistantTelemetry {
  reportAssistantInvoked: (params: { invokedBy: string; conversationId: string }) => void;
  reportAssistantMessageSent: (params: {
    conversationId: string;
    role: string;
    actionTypeId: string;
    model?: string;
    provider?: string;
    isEnabledKnowledgeBase: boolean;
  }) => void;
  reportAssistantQuickPrompt: (params: { conversationId: string; promptTitle: string }) => void;
  reportAssistantSettingToggled: (params: { assistantStreamingEnabled?: boolean }) => void;
}

export interface AssistantAvailability {
  // True when user is Enterprise, or Security Complete PLI for serverless. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
  // When true, user has `All` privilege for `Connectors and Actions` (show/execute/delete/save ui capabilities)
  hasConnectorsAllPrivilege: boolean;
  // When true, user has `Read` privilege for `Connectors and Actions` (show/execute ui capabilities)
  hasConnectorsReadPrivilege: boolean;
  // When true, user has `Edit` privilege for `AnonymizationFields`
  hasUpdateAIAssistantAnonymization: boolean;
  // When true, user has `Edit` privilege for `Global Knowledge Base`
  hasManageGlobalKnowledgeBase: boolean;
}

export type GetAssistantMessages = (commentArgs: {
  abortStream: () => void;
  currentConversation?: Conversation;
  isFetchingResponse: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  regenerateMessage: (conversationId: string) => void;
  showAnonymizedValues: boolean;
  currentUserAvatar?: UserAvatar;
  setIsStreaming: (isStreaming: boolean) => void;
  systemPromptContent?: string;
  contentReferencesVisible?: boolean;
  contentReferencesEnabled?: boolean;
}) => EuiCommentProps[];
