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

// Used to identify requests to EIS via the X-Elastic-Product-Use-Case header.
// Optionally set AGENT_BUILDER_TELEMETRY_SUFFIX to distinguish traffic (e.g. 'smoke_tests' → 'agent_builder_smoke_tests').
const suffix = process.env.AGENT_BUILDER_TELEMETRY_SUFFIX;
const pluginIdBase = 'agent_builder';

export const MODEL_TELEMETRY_METADATA = {
  pluginId: `${pluginIdBase}${suffix ? `_${suffix}` : ''}`,
};
