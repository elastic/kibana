/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { Logger } from '@kbn/core/server';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';
import type { GetScopedClients } from '../../routes/types';
import type { StreamsServer } from '../../types';
import {
  createFeatureKnowledgeIndicatorTool,
  STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID,
} from './create_feature_knowledge_indicator/tool';
import {
  createQueryKnowledgeIndicatorTool,
  STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID,
} from './create_query_knowledge_indicator/tool';
import { createGetDataQualityTool } from './read/get_data_quality';
import { createGetFailedDocumentsTool } from './read/get_failed_documents';
import { createGetLifecycleStatsTool } from './read/get_lifecycle_stats';
import { createGetSchemaTool } from './read/get_schema';
import { createGetStreamTool } from './read/get_stream';
import { createListStreamsTool } from './read/list_streams';
import { createQueryDocumentsTool } from './read/query_documents';
import {
  createSearchKnowledgeIndicatorsTool,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
} from './search_knowledge_indicators/tool';
import { createDeleteStreamTool } from './write/delete_stream';
import { createForkStreamTool } from './write/fork_stream';
import { createMapFieldsTool } from './write/map_fields';
import { createSetFailureStoreTool } from './write/set_failure_store';
import { createSetRetentionTool } from './write/set_retention';
import { createUpdateProcessorsTool } from './write/update_processors';
import { createUpdateStreamDescriptionTool } from './write/update_stream_description';
import { StreamsWriteQueue } from './write_queue';

export {
  STREAMS_DELETE_STREAM_TOOL_ID,
  STREAMS_FORK_STREAM_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_MAP_FIELDS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_READ_TOOL_IDS,
  STREAMS_SET_FAILURE_STORE_TOOL_ID,
  STREAMS_SET_RETENTION_TOOL_ID,
  STREAMS_UPDATE_DESCRIPTION_TOOL_ID,
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  STREAMS_WRITE_TOOL_IDS,
} from './tool_ids';

export {
  STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID,
  STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
};

export function registerAgentBuilderTools({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): void {
  if (!agentBuilder) {
    return;
  }

  const writeQueue = new StreamsWriteQueue();

  const streamsTools = [
    // Read tools
    createGetDataQualityTool({ getScopedClients, isServerless: server.isServerless }),
    createGetFailedDocumentsTool({ getScopedClients }),
    createGetLifecycleStatsTool({ getScopedClients }),
    createGetSchemaTool({ getScopedClients }),
    createGetStreamTool({ getScopedClients }),
    createListStreamsTool({ getScopedClients }),
    createQueryDocumentsTool({ getScopedClients }),

    // Write tools
    createDeleteStreamTool({ getScopedClients, writeQueue }),
    createForkStreamTool({ getScopedClients, writeQueue }),
    createMapFieldsTool({ getScopedClients, writeQueue }),
    createSetFailureStoreTool({ getScopedClients, writeQueue }),
    createSetRetentionTool({ getScopedClients, writeQueue }),
    createUpdateProcessorsTool({ getScopedClients, writeQueue }),
    createUpdateStreamDescriptionTool({ getScopedClients, writeQueue }),

    // Significant events tools
    createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger: logger.get('search_kis_tool'),
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
  ];

  for (const tool of streamsTools) {
    agentBuilder.tools.register(tool);
  }
}
