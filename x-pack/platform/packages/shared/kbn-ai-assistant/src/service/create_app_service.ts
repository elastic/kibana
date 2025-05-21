/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityAIAssistantService } from '@kbn/observability-ai-assistant-plugin/public';
import { AIAssistantPluginStartDependencies } from '../types';

export type AIAssistantAppService = ObservabilityAIAssistantService;

export function createAppService({
  pluginsStart,
}: {
  pluginsStart: AIAssistantPluginStartDependencies;
}): AIAssistantAppService {
  return {
    ...pluginsStart.observabilityAIAssistant.service,
  };
}
