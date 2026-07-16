/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID = 'agent_builder_parent';
export const AGENT_BUILDER_INFERENCE_FEATURE_ID = 'agent_builder';
export const AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID = 'agent_builder_fast';

export const AGENT_BUILDER_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.anthropic-claude-4.6-opus-chat_completion',
  '.openai-gpt-5.2-chat_completion',
];

export const AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.5-haiku-chat_completion',
  '.google-gemini-3.0-flash-chat_completion',
];

/**
 * ID of the (fake) user assigned as owner / creator for assets created by our system.
 */
export const SYSTEM_USER_ID = 'system';

/**
 * Connector IDs that existed in 9.3 but were removed in 9.4 when preconfigured
 * AI connectors replaced Elastic Managed LLM. Stored values with these IDs are
 * stale after an upgrade and should be remapped to LATEST_ELASTIC_MANAGED_CONNECTOR_ID.
 *
 * Kept in sync with kbn-elastic-assistant-common/impl/connectors/outdated_connectors.ts.
 */
export const OUTDATED_ELASTIC_MANAGED_CONNECTOR_IDS = [
  'Elastic-Managed-LLM',
  'General-Purpose-LLM-v1',
] as const;

/**
 * The current preconfigured Elastic connector ID to remap stale IDs to.
 * Must match FALLBACK_DEFAULT_CONNECTOR_ID in gen_ai_settings/common/constants.ts —
 * update both together when the preferred connector changes.
 */
export const LATEST_ELASTIC_MANAGED_CONNECTOR_ID = 'Anthropic-Claude-Sonnet-4-5';
