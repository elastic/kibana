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

/** Recommended endpoints for the workflows_ai feature. */
export const WORKFLOWS_AI_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
  '.openai-gpt-6-astra-chat_completion', // GPT-6 Astra, GA 2026-09-28
];
