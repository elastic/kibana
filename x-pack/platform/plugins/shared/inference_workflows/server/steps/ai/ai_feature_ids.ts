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

/** Inference feature ID for ai.prompt steps in Context Engine automation workflows. */
export const CONTEXT_ENGINE_PROMPT_FEATURE_ID = 'context_engine_prompt';

/** Recommended endpoints for the context_engine_prompt feature, ordered by preference. */
export const CONTEXT_ENGINE_PROMPT_RECOMMENDED_ENDPOINTS = [
  '.google-gemini-3.5-flash-lite-chat_completion',
  '.anthropic-claude-4.5-haiku-chat_completion',
];

/** Recommended endpoints for the workflows_ai feature. */
export const WORKFLOWS_AI_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.anthropic-claude-4.6-opus-chat_completion',
  '.openai-gpt-5.2-chat_completion',
];
