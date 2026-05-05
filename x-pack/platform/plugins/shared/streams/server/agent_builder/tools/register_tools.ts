/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
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
import { createInspectStreamsTool } from './read/inspect_streams';
import { createDiagnoseStreamTool } from './read/diagnose_stream';
import { createQueryDocumentsTool } from './read/query_documents';
import { createDesignPipelineTool } from './read/design_pipeline';
import {
  createSearchKnowledgeIndicatorsTool,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
} from './search_knowledge_indicators/tool';
import { createUpdateStreamTool } from './write/update_stream';
import { createCreatePartitionTool } from './write/create_partition';
import { createDeleteStreamTool } from './write/delete_stream';
import { StreamsWriteQueue } from '../utils/write_queue';

export {
  STREAMS_READ_TOOL_IDS,
  STREAMS_WRITE_TOOL_IDS,
  STREAMS_INSPECT_STREAMS_TOOL_ID,
  STREAMS_DIAGNOSE_STREAM_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_DESIGN_PIPELINE_TOOL_ID,
  STREAMS_UPDATE_STREAM_TOOL_ID,
  STREAMS_CREATE_PARTITION_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
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
    createInspectStreamsTool({ getScopedClients, isServerless: server.isServerless }),
    createDiagnoseStreamTool({
      getScopedClients,
      isServerless: server.isServerless,
      logger: logger.get('diagnose_stream'),
    }),
    createQueryDocumentsTool({ getScopedClients }),
    createDesignPipelineTool({ getScopedClients }),

    // Write tools
    createUpdateStreamTool({ getScopedClients, writeQueue }),
    createCreatePartitionTool({ getScopedClients, writeQueue }),
    createDeleteStreamTool({ getScopedClients, writeQueue }),

    // Significant events tools
    createSearchKnowledgeIndicatorsTool({
      getScopedClients,
      server,
      logger: logger.get('ki_search_tool'),
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
    agentBuilder.tools.register(tool as Parameters<typeof agentBuilder.tools.register>[0]);
  }
}
