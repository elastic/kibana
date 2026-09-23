/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WORKFLOWS_AI_PARENT_FEATURE_ID = 'workflows_ai';
export const AI_PROMPT_FEATURE_ID = 'ai_prompt';
export const AI_SUMMARIZE_FEATURE_ID = 'ai_summarize';
export const AI_CLASSIFY_FEATURE_ID = 'ai_classify';

// Mirrors AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID from the agent-builder package.
// When effort-level: low is set on an ai.prompt step, this feature is used for
// connector resolution so the step routes to the admin-configured fast/cheap model
// (Gemini Flash Lite, Haiku) rather than the frontier default.
export const AI_PROMPT_FAST_FEATURE_ID = 'agent_builder_fast';

/**
 * Recommended inference endpoints for Workflows AI steps.
 * Mirrors the Agent Builder recommended endpoint list.
 */
export const WORKFLOWS_AI_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.anthropic-claude-4.6-opus-chat_completion',
  '.openai-gpt-5.2-chat_completion',
];
