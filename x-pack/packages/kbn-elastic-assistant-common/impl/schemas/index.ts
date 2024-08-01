/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// API versioning constants
export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v1: '1',
  },
} as const;

export const PUBLIC_API_ACCESS = 'public';
export const INTERNAL_API_ACCESS = 'internal';

// Common Schemas
export * from './common_attributes.gen';

// Attack discovery Schemas
export * from './attack_discovery/common_attributes.gen';
export * from './attack_discovery/get_attack_discovery_route.gen';
export * from './attack_discovery/post_attack_discovery_route.gen';
export * from './attack_discovery/cancel_attack_discovery_route.gen';

// Defend insight Schemas
export * from './defend_insights/common_attributes.gen';
export * from './defend_insights/get_defend_insights_route.gen';
export * from './defend_insights/post_defend_insights_route.gen';

// Chat Schemas
export * from './chat/post_chat_complete_route.gen';

// Evaluation Schemas
export * from './evaluation/post_evaluate_route.gen';
export * from './evaluation/get_evaluate_route.gen';

// Capabilities Schemas
export * from './capabilities/get_capabilities_route.gen';

// Conversations Schemas
export * from './conversations/append_message.gen';
export * from './conversations/bulk_crud_conversations_route.gen';
export * from './conversations/common_attributes.gen';
export * from './conversations/crud_conversation_route.gen';
export * from './conversations/find_conversations_route.gen';

// Actions Connector Schemas
export * from './actions_connector/post_actions_connector_execute_route.gen';

// Knowledge Base Schemas
export * from './knowledge_base/crud_kb_route.gen';
export * from './knowledge_base/entries/bulk_crud_knowledge_base_entries_route.gen';
export * from './knowledge_base/entries/common_attributes.gen';
export * from './knowledge_base/entries/crud_knowledge_base_entries_route.gen';
export * from './knowledge_base/entries/find_knowledge_base_entries_route.gen';

export * from './prompts/find_prompts_route.gen';
export { PromptResponse, PromptTypeEnum } from './prompts/bulk_crud_prompts_route.gen';
