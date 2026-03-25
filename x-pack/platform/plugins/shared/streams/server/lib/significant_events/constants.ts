/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_CONNECTOR_IDS = {
  kiFeatureExtractionConnector: '.google-gemini-3.0-flash-chat_completion',
  kiQueryGenerationConnector: '.openai-gpt-5.2-chat_completion',
  discoveryAndSigEventsConnector: '.anthropic-claude-4.6-sonnet-chat_completion',
} as const;
