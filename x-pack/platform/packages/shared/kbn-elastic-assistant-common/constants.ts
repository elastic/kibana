/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ELASTIC_AI_ASSISTANT_URL = '/api/security_ai_assistant';
export const ELASTIC_AI_ASSISTANT_INTERNAL_URL = '/internal/elastic_assistant';

export const POST_ACTIONS_CONNECTOR_EXECUTE =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/actions/connector/{connectorId}/_execute` as const;

export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/current_user/conversations` as const;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID =
  `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/{id}` as const;

export const ELASTIC_AI_ASSISTANT_INTERNAL_CONVERSATIONS_URL =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/current_user/conversations` as const;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID_MESSAGES =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_CONVERSATIONS_URL}/{id}/messages` as const;

export const ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/chat/complete` as const;

export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_CONVERSATIONS_URL}/_bulk_action` as const;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_find` as const;

export const ELASTIC_AI_ASSISTANT_PROMPTS_URL = `${ELASTIC_AI_ASSISTANT_URL}/prompts` as const;
export const ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION =
  `${ELASTIC_AI_ASSISTANT_PROMPTS_URL}/_bulk_action` as const;
export const ELASTIC_AI_ASSISTANT_PROMPTS_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_PROMPTS_URL}/_find` as const;

export const ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/anonymization_fields` as const;
export const ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION =
  `${ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL}/_bulk_action` as const;
export const ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL}/_find` as const;

// TODO: Update existing 'status' endpoint to take resource as query param as to not conflict with 'entries'
export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/knowledge_base/{resource?}` as const;
export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/knowledge_base/entries` as const;
export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID =
  `${ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL}/{id}` as const;
export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL}/_find` as const;
export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION =
  `${ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL}/_bulk_action` as const;

export const ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_INDICES_URL =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/knowledge_base/_indices` as const;
export const ELASTIC_AI_ASSISTANT_EVALUATE_URL =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/evaluate` as const;

// Defend insights
export const DEFEND_INSIGHTS_TOOL_ID = 'defend-insights';
export const DEFEND_INSIGHTS = `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/defend_insights`;
export const DEFEND_INSIGHTS_BY_ID = `${DEFEND_INSIGHTS}/{id}`;

// Attack Discovery
export const ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG =
  'securitySolution.assistantAttackDiscoverySchedulingEnabled' as const;
export const ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID = 'attack-discovery' as const;

export const ATTACK_DISCOVERY = `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/attack_discovery` as const;
export const ATTACK_DISCOVERY_BY_CONNECTOR_ID = `${ATTACK_DISCOVERY}/{connectorId}` as const;
export const ATTACK_DISCOVERY_CANCEL_BY_CONNECTOR_ID =
  `${ATTACK_DISCOVERY}/cancel/{connectorId}` as const;
export const ATTACK_DISCOVERY_SCHEDULES = `${ATTACK_DISCOVERY}/schedules` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID = `${ATTACK_DISCOVERY_SCHEDULES}/{id}` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE =
  `${ATTACK_DISCOVERY_SCHEDULES}/{id}/_enable` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE =
  `${ATTACK_DISCOVERY_SCHEDULES}/{id}/_disable` as const;
export const ATTACK_DISCOVERY_SCHEDULES_FIND = `${ATTACK_DISCOVERY_SCHEDULES}/_find` as const;
