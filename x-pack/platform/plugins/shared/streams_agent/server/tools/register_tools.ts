/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { StreamsAgentCoreSetup, StreamsAgentPluginSetupDependencies } from '../types';
import { STREAMS_LIST_STREAMS_TOOL_ID, createListStreamsTool } from './read/list_streams';
import { STREAMS_GET_STREAM_TOOL_ID, createGetStreamTool } from './read/get_stream';
import {
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  createGetDataQualityTool,
} from './read/get_data_quality';
import { STREAMS_GET_SCHEMA_TOOL_ID, createGetSchemaTool } from './read/get_schema';
import {
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  createGetLifecycleStatsTool,
} from './read/get_lifecycle_stats';
import { STREAMS_QUERY_DOCUMENTS_TOOL_ID, createQueryDocumentsTool } from './read/query_documents';
import { STREAMS_SET_RETENTION_TOOL_ID, createSetRetentionTool } from './write/set_retention';
import { STREAMS_FORK_STREAM_TOOL_ID, createForkStreamTool } from './write/fork_stream';
import { STREAMS_DELETE_STREAM_TOOL_ID, createDeleteStreamTool } from './write/delete_stream';
import {
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  createUpdateProcessorsTool,
} from './write/update_processors';
import { STREAMS_MAP_FIELDS_TOOL_ID, createMapFieldsTool } from './write/map_fields';
import {
  STREAMS_ENABLE_FAILURE_STORE_TOOL_ID,
  createEnableFailureStoreTool,
} from './write/enable_failure_store';
import { STREAMS_UPDATE_SETTINGS_TOOL_ID, createUpdateSettingsTool } from './write/update_settings';
import {
  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  createSuggestPartitionsTool,
} from './generative/suggest_partitions';
import {
  STREAMS_GENERATE_DESCRIPTION_TOOL_ID,
  createGenerateDescriptionTool,
} from './generative/generate_description';
import {
  STREAMS_IDENTIFY_FEATURES_TOOL_ID,
  createIdentifyFeaturesTool,
} from './generative/identify_features';
import {
  STREAMS_IDENTIFY_SYSTEMS_TOOL_ID,
  createIdentifySystemsTool,
} from './generative/identify_systems';
import {
  STREAMS_ASSESS_STREAM_HEALTH_TOOL_ID,
  createAssessStreamHealthTool,
} from './advisory/assess_stream_health';
import {
  STREAMS_DIAGNOSE_DATA_QUALITY_TOOL_ID,
  createDiagnoseDataQualityTool,
} from './advisory/diagnose_data_quality';
import {
  STREAMS_OVERVIEW_STREAMS_TOOL_ID,
  createOverviewStreamsTool,
} from './advisory/overview_streams';

export const STREAMS_AGENT_TOOL_IDS = [
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,

  STREAMS_SET_RETENTION_TOOL_ID,
  STREAMS_FORK_STREAM_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  STREAMS_MAP_FIELDS_TOOL_ID,
  STREAMS_ENABLE_FAILURE_STORE_TOOL_ID,
  STREAMS_UPDATE_SETTINGS_TOOL_ID,

  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  STREAMS_GENERATE_DESCRIPTION_TOOL_ID,
  STREAMS_IDENTIFY_FEATURES_TOOL_ID,
  STREAMS_IDENTIFY_SYSTEMS_TOOL_ID,

  STREAMS_ASSESS_STREAM_HEALTH_TOOL_ID,
  STREAMS_DIAGNOSE_DATA_QUALITY_TOOL_ID,
  STREAMS_OVERVIEW_STREAMS_TOOL_ID,
];

export async function registerTools({
  core,
  plugins,
  logger,
}: {
  core: StreamsAgentCoreSetup;
  plugins: StreamsAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const streamsTools: StaticToolRegistration<any>[] = [
    // Read tools
    createListStreamsTool({ core }),
    createGetStreamTool({ core }),
    createGetDataQualityTool({ core }),
    createGetSchemaTool({ core }),
    createGetLifecycleStatsTool({ core }),
    createQueryDocumentsTool({ core }),
    // Write tools
    createSetRetentionTool({ core }),
    createForkStreamTool({ core }),
    createDeleteStreamTool({ core }),
    createUpdateProcessorsTool({ core }),
    createMapFieldsTool({ core }),
    createEnableFailureStoreTool({ core }),
    createUpdateSettingsTool({ core }),
    // Generative tools (LLM-powered analysis)
    createSuggestPartitionsTool({ core }),
    createGenerateDescriptionTool({ core }),
    createIdentifyFeaturesTool({ core }),
    createIdentifySystemsTool({ core }),
    // Advisory tools (composite tools for assessment and guidance)
    createAssessStreamHealthTool(),
    createDiagnoseDataQualityTool(),
    createOverviewStreamsTool(),
  ];

  for (const tool of streamsTools) {
    plugins.agentBuilder.tools.register(tool);
  }

  logger.debug(`Registered ${streamsTools.length} streams agent tools`);
}
