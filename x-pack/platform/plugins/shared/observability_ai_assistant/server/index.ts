/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

import type { ObservabilityAIAssistantConfig } from './config';

export type { ObservabilityAIAssistantServerRouteRepository } from './routes/get_global_observability_ai_assistant_route_repository';

import { config as configSchema } from './config';
export type { RegistrationCallback } from './service/types';
export type {
  ObservabilityAIAssistantServerStart,
  ObservabilityAIAssistantServerSetup,
} from './types';

export type { ObservabilityAIAssistantClient } from './service/client';

export {
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
} from '../common';

export { streamIntoObservable } from './service/util/stream_into_observable';

export { createFunctionRequestMessage } from '../common/utils/create_function_request_message';
export { createFunctionResponseMessage } from '../common/utils/create_function_response_message';

export const config: PluginConfigDescriptor<ObservabilityAIAssistantConfig> = {
  deprecations: ({ unusedFromRoot }) => [
    unusedFromRoot('xpack.observability.aiAssistant.enabled', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.deploymentId', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.resourceName', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.apiKey', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.openAI.apiKey', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.openAI.model', {
      level: 'warning',
    }),
  ],
  exposeToBrowser: { scope: true },
  schema: configSchema,
};

export const plugin = async (ctx: PluginInitializerContext<ObservabilityAIAssistantConfig>) => {
  const { ObservabilityAIAssistantPlugin } = await import('./plugin');
  return new ObservabilityAIAssistantPlugin(ctx);
};
