/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID = 'agent_builder_parent';
export const AGENT_BUILDER_INFERENCE_FEATURE_ID = 'agent_builder';
export const AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID = 'agent_builder_fast';

/**
 * Each list's last entry is served by the Serverless trial EIS catalog, which provisions none
 * of the entries above it. Without that entry the whole list fails to resolve on a trial
 * project and Agent Builder falls back to an arbitrary catalog default. On a paid project the
 * entry is only reached when nothing above it is provisioned.
 */
export const AGENT_BUILDER_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5.5-opus-chat_completion', // Claude Opus 5.5, GA 2026-09-22
  '.anthropic-claude-5.5-sonnet-chat_completion', // Claude Sonnet 5.5, GA 2026-09-28
  '.openai-gpt-6-sol-chat_completion', // GPT-6 Sol, GA 2026-09-28
  '.moonshot-kimi-k3-chat_completion', // Kimi K3 — trial-served
];

export const AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS = [
  '.google-gemini-3.5-flash-lite-chat_completion', // Gemini 3.5 Flash Lite, GA 2026-07-21
  '.anthropic-claude-4.5-haiku-chat_completion', // Claude Haiku 4.5, GA 2025-10-01
  '.openai-gpt-6-luna-chat_completion', // Luna-6 2026-09-28
  '.nvidia-nemotron-3.5-super-vl-chat_completion', // Nemotron 3.5 Super VL — trial-served
];

/**
 * ID of the (fake) user assigned as owner / creator for assets created by our system.
 */
export const SYSTEM_USER_ID = 'system';
