/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IconType } from '@elastic/eui';
import type { ToolSchema } from '@kbn/inference-common';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantChatService } from '../public';
import type { FunctionResponse } from './functions/types';

export enum MessageRole {
  System = 'system',
  Assistant = 'assistant',
  User = 'user',
  Function = 'function',
  Elastic = 'elastic',
}

export enum KnowledgeBaseEntryRole {
  AssistantSummarization = 'assistant_summarization',
  UserEntry = 'user_entry',
  Elastic = 'elastic',
}

export interface PendingMessage {
  message: Message['message'];
  aborted?: boolean;
  error?: any;
}

export interface Message {
  '@timestamp': string;
  message: {
    content?: string;
    name?: string;
    role: MessageRole;
    function_call?: {
      name: string;
      arguments?: string;
      trigger: MessageRole.Assistant | MessageRole.User | MessageRole.Elastic;
    };
    data?: string;
  };
}

export interface TokenCount {
  prompt: number;
  completion: number;
  total: number;
}

export interface Conversation {
  '@timestamp': string;
  user?: {
    id?: string;
    name: string;
  };
  conversation: {
    id: string;
    title: string;
    last_updated: string;
    token_count?: TokenCount;
  };
  messages: Message[];
  labels: Record<string, string>;
  numeric_labels: Record<string, number>;
  namespace: string;
  public: boolean;
}

export type ConversationRequestBase = Omit<Conversation, 'user' | 'conversation' | 'namespace'> & {
  conversation: { title: string; token_count?: TokenCount; id?: string };
};

export type ConversationCreateRequest = ConversationRequestBase;
export type ConversationUpdateRequest = ConversationRequestBase & {
  conversation: { id: string };
};

export interface KnowledgeBaseEntry {
  '@timestamp': string;
  id: string;
  title?: string;
  text: string;
  confidence: 'low' | 'medium' | 'high';
  is_correction: boolean;
  type?: 'user_instruction' | 'contextual';
  public: boolean;
  labels?: Record<string, string>;
  role: KnowledgeBaseEntryRole;
  user?: {
    name: string;
  };
}

export interface Instruction {
  id: string;
  text: string;
}

export interface AdHocInstruction {
  id?: string;
  text: string;
  instruction_type: 'user_instruction' | 'application_instruction';
}

export type InstructionOrPlainText = string | Instruction;

export enum KnowledgeBaseType {
  // user instructions are included in the system prompt regardless of the user's input
  UserInstruction = 'user_instruction',

  // contextual entries are only included in the system prompt if the user's input matches the context
  Contextual = 'contextual',
}

export interface ObservabilityAIAssistantScreenContextRequest {
  starterPrompts?: StarterPrompt[];
  screenDescription?: string;
  data?: Array<{
    name: string;
    description: string;
    value: any;
  }>;
  actions?: Array<{ name: string; description: string; parameters?: ToolSchema }>;
}

export type ScreenContextActionRespondFunction<TArguments> = ({}: {
  args: TArguments;
  signal: AbortSignal;
  connectorId: string;
  client: Pick<ObservabilityAIAssistantChatService, 'chat' | 'complete'>;
  messages: Message[];
}) => Promise<FunctionResponse>;

export interface ScreenContextActionDefinition<TArguments = any> {
  name: string;
  description: string;
  parameters?: ToolSchema;
  respond: ScreenContextActionRespondFunction<TArguments>;
}

export interface StarterPrompt {
  title: string;
  prompt: string;
  icon: IconType;
  scopes?: AssistantScope[];
}

export interface ObservabilityAIAssistantScreenContext {
  screenDescription?: string;
  data?: Array<{
    name: string;
    description: string;
    value: any;
  }>;
  actions?: Array<ScreenContextActionDefinition<any>>;
  starterPrompts?: StarterPrompt[];
}
