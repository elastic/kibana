/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Schema definition for client-side tool parameters
 */
export interface ClientToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    [key: string]: any;
  }>;
  required?: string[];
}

/**
 * Definition of a client-side tool that can be called by the AI
 */
export interface ClientTool<TParams = any> {
  /**
   * Human-readable description of what this tool does.
   * The AI uses this to decide when to call the tool.
   */
  description: string;
  
  /**
   * JSON schema defining the input parameters for this tool.
   */
  input: ClientToolInputSchema;
  
  /**
   * Function to execute when the AI calls this tool.
   * @param params - The parameters passed by the AI
   * @returns Optional return value or Promise
   */
  fn: (params: TParams) => void | Promise<void>;
}

/**
 * Map of client-side tools available to the AI
 */
export type ClientToolsMap = Record<string, ClientTool>;

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

  /**
   * Optional map of client-side tools that the AI can invoke.
   * The AI can call these tools by rendering <clientToolCall id="tool_id" params={...}> in its response.
   */
  clientTools?: ClientToolsMap;
}

