/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeBaseConfig } from '../assistant/types';

export const ATTACK_DISCOVERY_STORAGE_KEY = 'attackDiscovery';
export const DEFEND_INSIGHTS_STORAGE_KEY = 'defendInsights';
export const DEFAULT_ASSISTANT_NAMESPACE = 'elasticAssistantDefault';
export const END_LOCAL_STORAGE_KEY = 'end';
export const LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY = 'lastConversationId';
export const FILTERS_LOCAL_STORAGE_KEY = 'filters';
export const MAX_ALERTS_LOCAL_STORAGE_KEY = 'maxAlerts';
export const KNOWLEDGE_BASE_LOCAL_STORAGE_KEY = 'knowledgeBase';
export const QUERY_LOCAL_STORAGE_KEY = 'query';
export const SHOW_SETTINGS_TOUR_LOCAL_STORAGE_KEY = 'showSettingsTour';
export const START_LOCAL_STORAGE_KEY = 'start';
export const STREAMING_LOCAL_STORAGE_KEY = 'streaming';
export const CONTENT_REFERENCES_VISIBLE_LOCAL_STORAGE_KEY = 'contentReferencesVisible';
export const SHOW_ANONYMIZED_VALUES_LOCAL_STORAGE_KEY = 'showAnonymizedValues';
export const TRACE_OPTIONS_SESSION_STORAGE_KEY = 'traceOptions';
export const CONVERSATION_TABLE_SESSION_STORAGE_KEY = 'conversationTable';
export const QUICK_PROMPT_TABLE_SESSION_STORAGE_KEY = 'quickPromptTable';
export const SYSTEM_PROMPT_TABLE_SESSION_STORAGE_KEY = 'systemPromptTable';
export const ANONYMIZATION_TABLE_SESSION_STORAGE_KEY = 'anonymizationTable';

/** The default `n` latest alerts, ordered by risk score, sent as context to the assistant */
export const DEFAULT_LATEST_ALERTS = 100;

/** The default maximum number of alerts to be sent as context when generating Attack discoveries */
export const DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS = 100;

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseConfig = {
  latestAlerts: DEFAULT_LATEST_ALERTS,
};
