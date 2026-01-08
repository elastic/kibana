/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TrackingService, ToolCallSource } from './tracking_service';
export { AnalyticsService } from './analytics_service';
export { QueryUtils, type UsageCounterData } from './query_utils';
export {
  createAgentBuilderUsageCounter,
  trackToolCall,
  trackLLMUsage,
  trackConversationRound,
  trackQueryToResultTime,
  AGENTBUILDER_USAGE_DOMAIN,
} from './usage_counters';
export { registerTelemetryCollector, type AgentBuilderTelemetry } from './telemetry_collector';

// Used to identify requests to EIS originating from AgentBuilder (moved from old telemetry.ts)
export const MODEL_TELEMETRY_METADATA = {
  pluginId: 'agent_builder',
} as const;
