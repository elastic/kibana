/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PromptType = 'system' | 'user';

export interface Prompt {
  id: string;
  content: string;
  name: string;
  promptType: PromptType;
  isDefault?: boolean; // TODO: Should be renamed to isImmutable as this flag is used to prevent users from deleting prompts
  isNewConversationDefault?: boolean;
  isFlyoutMode?: boolean;
}

export interface KnowledgeBaseConfig {
  isEnabledRAGAlerts: boolean;
  isEnabledKnowledgeBase: boolean;
  latestAlerts: number;
}

export interface TraceOptions {
  apmUrl: string;
  langSmithProject: string;
  langSmithApiKey: string;
}
