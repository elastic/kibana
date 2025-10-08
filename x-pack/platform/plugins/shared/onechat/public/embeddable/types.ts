/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Props for the embeddable Conversation component
 */
export interface EmbeddableConversationProps {
  /**
   * Optional conversation ID to load an existing conversation.
   * If not provided, a new conversation will be started.
   */
  conversationId?: string;

  /**
   * Optional agent ID to use for new conversations.
   * If not provided, the default agent will be used.
   */
  agentId?: string;

  /**
   * Optional additional context to prepend to the first user message.
   * This context will be automatically included when the user sends their first message.
   */
  additionalContext?: string;

  /**
   * Optional height for the conversation container.
   * Can be a CSS string (e.g., '500px', '100%') or a number (pixels).
   * Defaults to '600px'.
   */
  height?: string | number;

  /**
   * Optional callback that fires when a new conversation is created.
   * Receives the new conversation ID.
   */
  onConversationCreated?: (conversationId: string) => void;

  /**
   * Optional CSS class name for custom styling.
   */
  className?: string;

  /**
   * Optional custom message to automatically submit when the component mounts.
   * This message will be sent immediately after the component is ready.
   */
  customMessage?: string;
}

