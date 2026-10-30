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
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
];

export const AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS = [
  '.google-gemini-3.5-flash-lite-chat_completion', // Gemini 3.5 Flash Lite, GA 2026-07-21 — primary (best cost/latency)
  '.anthropic-claude-4.5-haiku-chat_completion', // Claude Haiku 4.5, GA 2025-10-01 — fallback (p99 predictability)
];

/**
 * ID of the (fake) user assigned as owner / creator for assets created by our system.
 */
export const SYSTEM_USER_ID = 'system';
