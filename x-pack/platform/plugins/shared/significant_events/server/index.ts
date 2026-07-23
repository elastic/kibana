/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { SignificantEventsConfig } from '../common/config';
import { config } from './config';

export { config };

export const plugin = async (ctx: PluginInitializerContext<SignificantEventsConfig>) => {
  const { SignificantEventsPlugin } = await import('./plugin');
  return new SignificantEventsPlugin(ctx);
};

export { SIGNIFICANT_EVENTS_JUDGE_AGENT_ID } from './agent_builder/agents/discovery/judge';
export { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from './agent_builder/agents/discovery/discovery';

export {
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID,
} from './agent_builder/tools/tool_ids';

export type { SignificantEventsRouteRepository } from './routes';
