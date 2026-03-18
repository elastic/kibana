/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolsSetup } from '@kbn/agent-builder-plugin/server';
import type { GetScopedClients } from '../../routes/types';
import { createListStreamsTool } from './list_streams';
import { createGetStreamTool } from './get_stream';
import { createGetSchemaTool } from './get_schema';
import { createGetDataQualityTool } from './get_data_quality';
import { createGetLifecycleStatsTool } from './get_lifecycle_stats';
import { createQueryDocumentsTool } from './query_documents';

export {
  STREAMS_TOOL_IDS,
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
} from './tool_ids';

export const registerStreamsTools = ({
  tools,
  getScopedClients,
}: {
  tools: ToolsSetup;
  getScopedClients: GetScopedClients;
}) => {
  const streamsTools = [
    createListStreamsTool({ getScopedClients }),
    createGetStreamTool({ getScopedClients }),
    createGetSchemaTool({ getScopedClients }),
    createGetDataQualityTool({ getScopedClients }),
    createGetLifecycleStatsTool({ getScopedClients }),
    createQueryDocumentsTool({ getScopedClients }),
  ];

  for (const tool of streamsTools) {
    tools.register(tool);
  }
};
