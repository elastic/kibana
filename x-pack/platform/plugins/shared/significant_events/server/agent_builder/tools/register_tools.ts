/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../routes/types';
import {
  createMemoryListTool,
  createMemoryReadTool,
  createMemorySearchTool,
  type MemoryToolsOptions,
} from '../../memory_and_investigation/tools/memory';
import { createFeatureSimilaritySearchTool } from './feature_similarity_search/tool';
import { createFeatureKnowledgeIndicatorTool } from './create_feature_knowledge_indicator/tool';
import { createQueryKnowledgeIndicatorTool } from './create_query_knowledge_indicator/tool';
import { createSearchKnowledgeIndicatorsTool } from './search_knowledge_indicators/tool';
import { createSearchEventsTool } from './event_search/tool';
import { createEventTool } from './event_create/tool';
import { createEventStatusUpdateTool } from './event_status_update/tool';
import { createEventInvestigationAttachTool } from '../../memory_and_investigation/tools/event_investigation_attach/tool';
import { createEventsWriteTool } from './event_write/tool';
import { createFinalizeFeaturesTool } from './finalize_features/tool';
import { createSignificantEventsAvailability } from './significant_events_availability';
export {
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID,
  SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
} from './tool_ids';

export function registerAgentBuilderTools({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  memoryToolsOptions,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  memoryToolsOptions: MemoryToolsOptions;
}): void {
  if (!agentBuilder) {
    return;
  }

  const tools = [
    // Significant events tools
    createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger: logger.get('ki_search_tool'),
    }),
    createFeatureSimilaritySearchTool({
      getScopedClients,
      server,
      logger: logger.get('ki_feature_similarity_search_tool'),
    }),
    createFeatureKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger: logger.get('ki_feature_create_tool'),
      telemetry,
    }),
    createQueryKnowledgeIndicatorTool({
      getScopedClients,
      server,
      logger: logger.get('ki_query_create_tool'),
      telemetry,
    }),
    createSearchEventsTool({
      getScopedClients,
      server,
      logger: logger.get('event_search_tool'),
      telemetry,
    }),
    createEventTool({
      getScopedClients,
      server,
      logger: logger.get('event_create_tool'),
      telemetry,
    }),
    createEventStatusUpdateTool({
      getScopedClients,
      server,
      logger: logger.get('event_status_update_tool'),
      telemetry,
    }),
    createEventInvestigationAttachTool({
      getScopedClients,
      server,
      logger: logger.get('event_investigation_attach_tool'),
      telemetry,
    }),
    createEventsWriteTool({
      getScopedClients,
      server,
      logger: logger.get('events_write_tool'),
      telemetry,
    }),
    ...[createMemorySearchTool, createMemoryReadTool, createMemoryListTool].map((createTool) => ({
      ...createTool(memoryToolsOptions),
      annotations: {
        title: 'Read Significant Events Memory',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      tags: ['streams', 'significant-events', 'feature-identification'],
      availability: createSignificantEventsAvailability({
        server,
        logger: logger.get('memory_read_tool'),
      }),
    })),
    createFinalizeFeaturesTool(),
  ];

  for (const tool of tools) {
    agentBuilder.tools.register(tool as Parameters<typeof agentBuilder.tools.register>[0]);
  }
}
