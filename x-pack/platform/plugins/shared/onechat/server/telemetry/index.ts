/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TrackingService, ToolCallSource } from './tracking_service';
export { QueryUtils, type UsageCounterData } from './query_utils';
export {
  createOnechatUsageCounter,
  trackToolCall,
  trackLLMUsage,
  trackConversationRound,
  trackQueryToResultTime,
  ONECHAT_USAGE_DOMAIN,
} from './usage_counters';
export { registerTelemetryCollector, type OnechatTelemetry } from './telemetry_collector';

// Used to identify requests to EIS originating from OneChat (moved from old telemetry.ts)
export const MODEL_TELEMETRY_METADATA = {
  pluginId: 'one_chat',
} as const;
