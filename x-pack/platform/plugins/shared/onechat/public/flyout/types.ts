/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Options for opening a conversation flyout
 */
export interface OpenConversationFlyoutOptions {
  /**
   * Optional conversation ID to load an existing conversation.
   * If not provided, a new conversation will be started.
   */
  conversationId?: string;

  /**
   * Optional agent ID to use for the conversation.
   * If not provided, the default agent will be used.
   */
  agentId?: string;

  /**
   * Optional additional context to provide to the conversation.
   * This can be used to pass relevant information to the AI assistant.
   */
  additionalContext?: string;

  /**
   * Optional callback that fires when a new conversation is created.
   */
  onConversationCreated?: (conversationId: string) => void;
}

/**
 * Props for the internal ConversationFlyout component
 */
export interface ConversationFlyoutProps extends OpenConversationFlyoutOptions {
  /**
   * Callback to close the flyout
   */
  onClose: () => void;
}
