/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeBaseConfig } from '../assistant/types';

export const DEFAULT_ASSISTANT_NAMESPACE = 'elasticAssistantDefault';
export const QUICK_PROMPT_LOCAL_STORAGE_KEY = 'quickPrompts';
export const SYSTEM_PROMPT_LOCAL_STORAGE_KEY = 'systemPrompts';
export const LAST_CONVERSATION_TITLE_LOCAL_STORAGE_KEY = 'lastConversationTitle';
export const KNOWLEDGE_BASE_LOCAL_STORAGE_KEY = 'knowledgeBase';

/** The default `n` latest alerts, ordered by risk score, sent as context to the assistant */
export const DEFAULT_LATEST_ALERTS = 20;

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseConfig = {
  isEnabledRAGAlerts: false,
  isEnabledKnowledgeBase: false,
  latestAlerts: DEFAULT_LATEST_ALERTS,
};
