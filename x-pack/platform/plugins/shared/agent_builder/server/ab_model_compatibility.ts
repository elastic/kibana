/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validated models that Agent Builder can recommend.
 *
 * A model must pass the full AB compatibility test suite (chat, streaming,
 * tool calling, workflows, sub-agents) before being added here.
 * Once listed, the RecommendedEndpointsPoller will automatically promote it
 * when EIS marks it as the newest capable/balanced model for its family.
 *
 * Key: inference_id Value: ISO date when AB validation was confirmed
 */
export const AB_VALIDATED_MODELS: ReadonlyMap<string, string> = new Map([
  ['.anthropic-claude-4.6-sonnet-chat_completion', '2025-01-01'],
  ['.anthropic-claude-4.6-opus-chat_completion', '2025-01-01'],
  ['.openai-gpt-5.2-chat_completion', '2025-01-01'],
  ['.anthropic-claude-4.5-haiku-chat_completion', '2025-01-01'],
  ['.google-gemini-3.0-flash-chat_completion', '2025-01-01'],
]);

export const isAbValidated = (inferenceId: string): boolean => AB_VALIDATED_MODELS.has(inferenceId);
