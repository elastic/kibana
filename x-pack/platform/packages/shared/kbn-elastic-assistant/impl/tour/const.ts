/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum NEW_FEATURES_TOUR_STORAGE_KEYS {
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  ANONYMIZED_VALUES_AND_CITATIONS = 'ANONYMIZED_VALUES_AND_CITATIONS',
  ELASTIC_LLM_USAGE_ATTACK_DISCOVERY = 'ELASTIC_LLM_USAGE_ATTACK_DISCOVERY',
  ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT = 'ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT',
  ELASTIC_LLM_USAGE_ASSISTANT_HEADER = 'ELASTIC_LLM_USAGE_ASSISTANT_HEADER',
  CONVERSATION_CONNECTOR_ELASTIC_LLM = 'CONVERSATION_CONNECTOR_ELASTIC_LLM',
}

export const NEW_TOUR_FEATURES_TOUR_STORAGE_KEYS: Record<NEW_FEATURES_TOUR_STORAGE_KEYS, string> = {
  KNOWLEDGE_BASE: 'elasticAssistant.knowledgeBase.newFeaturesTour.v8.16',
  ANONYMIZED_VALUES_AND_CITATIONS:
    'elasticAssistant.anonymizedValuesAndCitationsTourCompleted.v8.18',
  ELASTIC_LLM_USAGE_ATTACK_DISCOVERY:
    'elasticAssistant.elasticLLM.costAwarenessTour.attackDiscovery.v8.19',
  ELASTIC_LLM_USAGE_ATTACK_DISCOVERY_FLYOUT:
    'elasticAssistant.elasticLLM.costAwarenessTour.attackDiscoveryFlyout.v8.19',
  ELASTIC_LLM_USAGE_ASSISTANT_HEADER:
    'elasticAssistant.elasticLLM.costAwarenessTour.assistantHeader.v8.19',
  CONVERSATION_CONNECTOR_ELASTIC_LLM:
    'elasticAssistant.elasticLLM.conversation.costAwarenessTour.v8.19',
};
