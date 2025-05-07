/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import { InferenceConfig, configSchema } from './config';
import type {
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';
import { InferencePlugin } from './plugin';

export type { InferenceClient, BoundInferenceClient } from './inference_client';
export type { InferenceServerSetup, InferenceServerStart };

export { withChatCompleteSpan } from './tracing/with_chat_complete_span';
export { withInferenceSpan } from './tracing/with_inference_span';
export { withExecuteToolSpan } from './tracing/with_execute_tool_span';

export { naturalLanguageToEsql } from './tasks/nl_to_esql';

export const plugin: PluginInitializer<
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InferenceConfig>) =>
  new InferencePlugin(pluginInitializerContext);

export const config: PluginConfigDescriptor<InferenceConfig> = {
  schema: configSchema,
};
