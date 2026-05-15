/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ToolType } from '@kbn/agent-builder-common';
import type { StaticWorkflowTool } from '@kbn/agent-builder-server';
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
import { createListIlmPoliciesTool } from './read/list_ilm_policies';
import {
  createSearchKnowledgeIndicatorsTool,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
} from './search_knowledge_indicators/tool';
import { createUpdateStreamTool } from './write/update_stream';
import { createCreatePartitionTool } from './write/create_partition';
import { createDeleteStreamTool } from './write/delete_stream';
import { StreamsWriteQueue } from '../utils/write_queue';
import { WRITE_MEMORY_PAGE_WORKFLOW_NAME } from '../../../common/constants';

export {
  STREAMS_READ_TOOL_IDS,
  STREAMS_WRITE_TOOL_IDS,
  STREAMS_INSPECT_STREAMS_TOOL_ID,
  STREAMS_DIAGNOSE_STREAM_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_DESIGN_PIPELINE_TOOL_ID,
  STREAMS_LIST_ILM_POLICIES_TOOL_ID,
  STREAMS_UPDATE_STREAM_TOOL_ID,
  STREAMS_CREATE_PARTITION_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
} from './tool_ids';

export {
  STREAMS_CREATE_FEATURE_KNOWLEDGE_INDICATOR_TOOL_ID,
  STREAMS_CREATE_QUERY_KNOWLEDGE_INDICATOR_TOOL_ID,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
};

export const STREAMS_MEMORY_WRITE_PAGE_TOOL_ID = 'platform.streams.memory.write_page';

async function createMemoryWritePageTool(
  workflowsManagement: WorkflowsServerPluginSetup
): Promise<StaticWorkflowTool> {
  const { results } = await workflowsManagement.management.getWorkflows(
    { query: WRITE_MEMORY_PAGE_WORKFLOW_NAME, size: 50, page: 1 },
    DEFAULT_SPACE_ID
  );
  const workflow = results.find((w) => w.name === WRITE_MEMORY_PAGE_WORKFLOW_NAME);
  if (!workflow) {
    throw new Error(
      `"${WRITE_MEMORY_PAGE_WORKFLOW_NAME}" workflow not found. Deploy it via streams-program before starting Kibana.`
    );
  }
  return {
    id: STREAMS_MEMORY_WRITE_PAGE_TOOL_ID,
    type: ToolType.workflow,
    description:
      'Write or update a memory page. Creates a new append-only document in the memories data stream. ' +
      'Set is_deleted: true to soft-delete a page.',
    tags: ['memory'],
    configuration: {
      workflow_id: workflow.id,
      wait_for_completion: true,
    },
  };
}

export async function registerAgentBuilderTools({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  workflowsManagement,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  workflowsManagement?: WorkflowsServerPluginSetup;
}): Promise<void> {
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
    createListIlmPoliciesTool({ getScopedClients, isServerless: server.isServerless }),

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

  if (workflowsManagement) {
    try {
      const writePageTool = await createMemoryWritePageTool(workflowsManagement);
      agentBuilder.tools.register(
        writePageTool as Parameters<typeof agentBuilder.tools.register>[0]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Memory write workflow tool not registered: ${msg}`);
    }
  }
}
