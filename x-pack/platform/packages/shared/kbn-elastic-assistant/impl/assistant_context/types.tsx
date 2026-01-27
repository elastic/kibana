/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiConfig,
  InterruptResumeValue,
  Message,
  Replacements,
  User,
} from '@kbn/elastic-assistant-common';
import type { EuiCommentProps } from '@elastic/eui';

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
  createdBy: User;
  users: User[];
  category: string;
  id: string;
  title: string;
  messages: ClientMessage[];
  updatedAt?: string;
  createdAt: string;
  replacements: Replacements;
  excludeFromLastConversationStorage?: boolean;
}

export interface AssistantTelemetry {
  reportAssistantInvoked: (params: { invokedBy: string }) => void;
  reportAssistantMessageSent: (params: {
    role: string;
    actionTypeId: string;
    model?: string;
    provider?: string;
    isEnabledKnowledgeBase: boolean;
  }) => void;
  reportAssistantQuickPrompt: (params: { promptTitle: string }) => void;
  reportAssistantStarterPrompt: (params: { promptTitle: string }) => void;
  reportAssistantSettingToggled: (params: {
    assistantStreamingEnabled?: boolean;
    alertsCountUpdated?: boolean;
  }) => void;
}

export interface AssistantAvailability {
  // True when searchAiLake configurations is available
  hasSearchAILakeConfigurations: boolean;
  // True when user is Enterprise, or Security Complete PLI for serverless. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // True when the Assistant is visible, i.e. the Assistant is available and the Assistant is visible in the UI
  isAssistantVisible: boolean;
  // When true, user has `All` privilege for `Management > AI Assistant`
  isAssistantManagementEnabled: boolean;
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
  // When true, user has privilege to access Agent Builder feature
  hasAgentBuilderPrivilege?: boolean;
  // When true, use has privilege to manage Agent Builder feature
  hasAgentBuilderManagePrivilege?: boolean;
}

export type GetAssistantMessages = (commentArgs: {
  abortStream: () => void;
  currentConversation?: Conversation;
  isConversationOwner: boolean;
  isFetchingResponse: boolean;
  refetchCurrentConversation: ({ isStreamRefetch }: { isStreamRefetch?: boolean }) => void;
  regenerateMessage: (conversationId: string) => void;
  showAnonymizedValues: boolean;
  setIsStreaming: (isStreaming: boolean) => void;
  systemPromptContent?: string;
  contentReferencesVisible: boolean;
}) => EuiCommentProps[];

export type ResumeGraphFunction = (
  threadId: string,
  resumeValue: InterruptResumeValue
) => Promise<void>;
