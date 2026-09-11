/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ConfigSchema } from './config';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};

export const plugin = async (ctx: PluginInitializerContext) => {
  const { SignificantEventsPlugin } = await import('./plugin');
  return new SignificantEventsPlugin(ctx);
};

export { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from './agent_builder/agents/discovery/discovery';

export { KI_QUERY_GENERATION_AGENT_ID } from './agent_builder/agents/ki_query_generation';
export {
  WRITE_QUERIES_TOOL_ID,
  type AcceptedQuery,
} from './agent_builder/skills/ki_query_generation';
export { buildKIQueryGenerationUserMessage } from './lib/significant_events/identify_ki_queries_via_agent';

export { FEATURE_IDENTIFICATION_AGENT_ID } from './agent_builder/agents/feature_identification';
export { FINALIZE_FEATURES_TOOL_ID } from './agent_builder/skills/feature_identification';
export { buildFeatureIdentificationUserMessage } from './lib/significant_events/features/build_user_message';
export { compactInferenceDocuments } from './lib/significant_events/features/prepare_inferred_sampling';
export {
  parseFinalizedFeatures,
  type RawFinalizeFeaturesParams,
} from './lib/significant_events/features/parse_finalized_features';

export { SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID } from './agent_builder/tools/tool_ids';

export { platformStreamsMemoryTools } from './memory_and_investigation/tools/memory/tool_ids';

export { createMemoryDiscoveryTools } from './lib/significant_events/memory_discovery_tools';
export { MemoryServiceImpl } from './memory_and_investigation/lib/memory';

export type { SignificantEventsRouteRepository } from './routes';
