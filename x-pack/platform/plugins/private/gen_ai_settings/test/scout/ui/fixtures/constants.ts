/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutTestConfig } from '@kbn/scout';

/**
 * AI Assistant Type values - mirrors @kbn/ai-assistant-management-plugin/public AIAssistantType
 * Using string literals to avoid browser-side imports that cause "document is not defined" errors
 */
export const AIAssistantType = {
  Default: 'default',
  Observability: 'observability',
  Security: 'security',
  Never: 'never',
} as const;

export type AIAssistantTypeValue = (typeof AIAssistantType)[keyof typeof AIAssistantType];

/**
 * Whether the chat experience is pinned through `uiSettings.overrides`, which makes the setting impossible to set or unset.
 */
export const isChatExperiencePinned = ({ serverless, projectType }: ScoutTestConfig): boolean =>
  serverless && (projectType === 'es' || projectType === 'vectordb');
