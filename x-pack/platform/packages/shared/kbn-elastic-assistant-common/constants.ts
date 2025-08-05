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

// Alert summary
export const ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL =
  `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/alert_summary` as const;
export const ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_BULK_ACTION =
  `${ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL}/_bulk_action` as const;
export const ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL}/_find` as const;

// Security AI Prompts (prompt integration)
export const ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL =
  `${ELASTIC_AI_ASSISTANT_URL}/security_ai_prompts` as const;
export const ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL_FIND =
  `${ELASTIC_AI_ASSISTANT_SECURITY_AI_PROMPTS_URL}/_find` as const;

// Defend insights
export const DEFEND_INSIGHTS_TOOL_ID = 'defend-insights';
export const DEFEND_INSIGHTS = `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/defend_insights`;
export const DEFEND_INSIGHTS_BY_ID = `${DEFEND_INSIGHTS}/{id}`;

// Attack Discovery
export const ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG =
  'securitySolution.assistantAttackDiscoverySchedulingEnabled' as const;
export const ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID = 'attack-discovery' as const;
export const ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID = 'siem' as const;

export const ATTACK_DISCOVERY = `${ELASTIC_AI_ASSISTANT_INTERNAL_URL}/attack_discovery` as const;
export const ATTACK_DISCOVERY_BULK = `${ATTACK_DISCOVERY}/_bulk` as const;
export const ATTACK_DISCOVERY_BY_CONNECTOR_ID = `${ATTACK_DISCOVERY}/{connectorId}` as const;
export const ATTACK_DISCOVERY_CANCEL_BY_CONNECTOR_ID =
  `${ATTACK_DISCOVERY}/cancel/{connectorId}` as const;
export const ATTACK_DISCOVERY_FIND = `${ATTACK_DISCOVERY}/_find` as const;
export const ATTACK_DISCOVERY_GENERATIONS = `${ATTACK_DISCOVERY}/generations` as const;
export const ATTACK_DISCOVERY_GENERATIONS_BY_ID =
  `${ATTACK_DISCOVERY_GENERATIONS}/{execution_uuid}` as const;
export const ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS =
  `${ATTACK_DISCOVERY_GENERATIONS_BY_ID}/_dismiss` as const;
export const ATTACK_DISCOVERY_SCHEDULES = `${ATTACK_DISCOVERY}/schedules` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID = `${ATTACK_DISCOVERY_SCHEDULES}/{id}` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID_ENABLE =
  `${ATTACK_DISCOVERY_SCHEDULES}/{id}/_enable` as const;
export const ATTACK_DISCOVERY_SCHEDULES_BY_ID_DISABLE =
  `${ATTACK_DISCOVERY_SCHEDULES}/{id}/_disable` as const;
export const ATTACK_DISCOVERY_SCHEDULES_FIND = `${ATTACK_DISCOVERY_SCHEDULES}/_find` as const;

/** A fake `kibana.alert.rule.uuid` for ad hock rules */
export const ATTACK_DISCOVERY_AD_HOC_RULE_ID = 'attack_discovery_ad_hoc_rule_id' as const;

/** A fake `kibana.alert.rule.rule_type_id` for ad hock rules */
export const ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID = 'attack_discovery_ad_hoc_rule_type_id' as const;

/**
 * This feature flag enables the Attack discoveries alerts feature.
 *
 * It may be overridden via the following setting in `kibana.yml` or `kibana.dev.yml`:
 * ```
 * feature_flags.overrides:
 *   securitySolution.attackDiscoveryAlertsEnabled: true
 * ```
 */
export const ATTACK_DISCOVERY_ALERTS_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryAlertsEnabled' as const;

/**
 * The common prefix for all (ad hoc and scheduled) Attack discovery alerts indices
 */
export const ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX =
  '.alerts-security.attack.discovery.alerts' as const;

/**
 * This feature flag disables the InferenceChatModel feature.
 *
 * It may be overridden via the following setting in `kibana.yml` or `kibana.dev.yml`:
 * ```
 * feature_flags.overrides:
 *   securitySolution.inferenceChatModelDisabled: true
 * ```
 */
export const INFERENCE_CHAT_MODEL_DISABLED_FEATURE_FLAG =
  'securitySolution.inferenceChatModelDisabled' as const;

/**
 * The server timeout is set to 4 minutes to allow for long-running requests.
 * The allows slower LLMs (like Llama 3.1 70B) and complex tasks such as ESQL generation to complete
 * without being interrupted.
 */
export const INVOKE_LLM_SERVER_TIMEOUT = 4 * 60 * 1000; // 4 minutes
/**
 * The client timeout is set to 3 seconds less than the server timeout to prevent
 * the `core-http-browser` from retrying the request.
 *
 */
export const INVOKE_LLM_CLIENT_TIMEOUT = INVOKE_LLM_SERVER_TIMEOUT - 3000; // 4 minutes - 3 second
