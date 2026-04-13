/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { StreamsServer } from '../../types';
import type { GetScopedClients } from '../../routes/types';
import { createListStreamsTool } from './read/list_streams';
import { createGetStreamTool } from './read/get_stream';
import { createGetSchemaTool } from './read/get_schema';
import { createGetDataQualityTool } from './read/get_data_quality';
import { createGetLifecycleStatsTool } from './read/get_lifecycle_stats';
import { createQueryDocumentsTool } from './read/query_documents';
import { createGetFailedDocumentsTool } from './read/get_failed_documents';
import {
  createSearchKnowledgeIndicatorsTool,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
} from './search_knowledge_indicators/tool';
import { createSetRetentionTool } from './write/set_retention';
import { createForkStreamTool } from './write/fork_stream';
import { createDeleteStreamTool } from './write/delete_stream';
import { createUpdateProcessorsTool } from './write/update_processors';
import { createMapFieldsTool } from './write/map_fields';
import { createSetFailureStoreTool } from './write/set_failure_store';
import { createUpdateStreamDescriptionTool } from './write/update_stream_description';
import { StreamsWriteQueue } from './write_queue';

export {
  STREAMS_READ_TOOL_IDS,
  STREAMS_WRITE_TOOL_IDS,
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID,
  STREAMS_SET_RETENTION_TOOL_ID,
  STREAMS_FORK_STREAM_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  STREAMS_MAP_FIELDS_TOOL_ID,
  STREAMS_SET_FAILURE_STORE_TOOL_ID,
  STREAMS_UPDATE_DESCRIPTION_TOOL_ID,
} from './tool_ids';

export { STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID };

export function registerAgentBuilderTools({
  agentBuilder,
  getScopedClients,
  server,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
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
  ];

  for (const tool of streamsTools) {
    agentBuilder.tools.register(tool);
  }
}
