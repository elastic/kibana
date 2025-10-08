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
   * If not provided, will try to load the last conversation from the flyout
   * (unless newChat is true or agentId doesn't match).
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
   * If true, always start a new conversation (don't restore previous flyout conversation).
   * Defaults to false.
   */
  newChat?: boolean;

  /**
   * Optional callback that fires when a new conversation is created.
   */
  onConversationCreated?: (conversationId: string) => void;

  /**
   * Optional custom message to automatically submit when the flyout opens.
   * This message will be sent immediately after the flyout is rendered.
   */
  customMessage?: string;
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
