/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeBaseConfig } from '../assistant/types';

export const ATTACK_DISCOVERY_STORAGE_KEY = 'attackDiscovery';
export const DEFAULT_ASSISTANT_NAMESPACE = 'elasticAssistantDefault';
export const LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY = 'lastConversationId';
export const KNOWLEDGE_BASE_LOCAL_STORAGE_KEY = 'knowledgeBase';
export const STREAMING_LOCAL_STORAGE_KEY = 'streaming';
export const TRACE_OPTIONS_SESSION_STORAGE_KEY = 'traceOptions';
export const CONVERSATION_TABLE_SESSION_STORAGE_KEY = 'conversationTable';
export const QUICK_PROMPT_TABLE_SESSION_STORAGE_KEY = 'quickPromptTable';
export const SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY = 'systemPromptTable';
export const ANONYMIZATION_TABLE_SESSION_STORAGE_KEY = 'anonymizationTable';

/** The default `n` latest alerts, ordered by risk score, sent as context to the assistant */
export const DEFAULT_LATEST_ALERTS = 20;

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseConfig = {
  latestAlerts: DEFAULT_LATEST_ALERTS,
};
