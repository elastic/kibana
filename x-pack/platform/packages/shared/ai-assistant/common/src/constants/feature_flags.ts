/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flag for enabling AI Agent functionality across AI Assistant plugins.
 * When disabled, hides:
 * - AI Agent card in the selection modal
 * - Chat Experience setting in GenAI Settings
 */
export const AI_AGENTS_FEATURE_FLAG = 'aiAssistant.aiAgents.enabled';
export const AI_AGENTS_FEATURE_FLAG_DEFAULT = true;
