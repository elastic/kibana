/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type {
  StreamsAgentCoreSetup,
  StreamsAgentPluginSetupDependencies,
} from '../types';
import { STREAMS_LIST_STREAMS_TOOL_ID, createListStreamsTool } from './list_streams';
import { STREAMS_GET_STREAM_TOOL_ID, createGetStreamTool } from './get_stream';
import { STREAMS_GET_DATA_QUALITY_TOOL_ID, createGetDataQualityTool } from './get_data_quality';
import { STREAMS_GET_SCHEMA_TOOL_ID, createGetSchemaTool } from './get_schema';
import { STREAMS_GET_LIFECYCLE_STATS_TOOL_ID, createGetLifecycleStatsTool } from './get_lifecycle_stats';
import { STREAMS_SET_RETENTION_TOOL_ID, createSetRetentionTool } from './set_retention';
import { STREAMS_FORK_STREAM_TOOL_ID, createForkStreamTool } from './fork_stream';
import { STREAMS_DELETE_STREAM_TOOL_ID, createDeleteStreamTool } from './delete_stream';
import { STREAMS_UPDATE_PROCESSORS_TOOL_ID, createUpdateProcessorsTool } from './update_processors';
import { STREAMS_MAP_FIELDS_TOOL_ID, createMapFieldsTool } from './map_fields';
import { STREAMS_ENABLE_FAILURE_STORE_TOOL_ID, createEnableFailureStoreTool } from './enable_failure_store';
import { STREAMS_UPDATE_SETTINGS_TOOL_ID, createUpdateSettingsTool } from './update_settings';
import { STREAMS_SUGGEST_PARTITIONS_TOOL_ID, createSuggestPartitionsTool } from './suggest_partitions';
import { STREAMS_GENERATE_DESCRIPTION_TOOL_ID, createGenerateDescriptionTool } from './generate_description';
import { STREAMS_IDENTIFY_FEATURES_TOOL_ID, createIdentifyFeaturesTool } from './identify_features';
import { STREAMS_IDENTIFY_SYSTEMS_TOOL_ID, createIdentifySystemsTool } from './identify_systems';

const STREAMS_READ_TOOL_IDS = [
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
];

const STREAMS_WRITE_TOOL_IDS = [
  STREAMS_SET_RETENTION_TOOL_ID,
  STREAMS_FORK_STREAM_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  STREAMS_MAP_FIELDS_TOOL_ID,
  STREAMS_ENABLE_FAILURE_STORE_TOOL_ID,
  STREAMS_UPDATE_SETTINGS_TOOL_ID,
];

const STREAMS_AI_TOOL_IDS = [
  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  STREAMS_GENERATE_DESCRIPTION_TOOL_ID,
  STREAMS_IDENTIFY_FEATURES_TOOL_ID,
  STREAMS_IDENTIFY_SYSTEMS_TOOL_ID,
];

export const STREAMS_AGENT_TOOL_IDS = [
  ...STREAMS_READ_TOOL_IDS,
  ...STREAMS_WRITE_TOOL_IDS,
  ...STREAMS_AI_TOOL_IDS,
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
    createListStreamsTool({ core, logger }),
    createGetStreamTool({ core, logger }),
    createGetDataQualityTool({ core, logger }),
    createGetSchemaTool({ core, logger }),
    createGetLifecycleStatsTool({ core, logger }),
    // Write tools
    createSetRetentionTool({ core, logger }),
    createForkStreamTool({ core, logger }),
    createDeleteStreamTool({ core, logger }),
    createUpdateProcessorsTool({ core, logger }),
    createMapFieldsTool({ core, logger }),
    createEnableFailureStoreTool({ core, logger }),
    createUpdateSettingsTool({ core, logger }),
    // AI orchestration tools
    createSuggestPartitionsTool({ core, logger }),
    createGenerateDescriptionTool({ core, logger }),
    createIdentifyFeaturesTool({ core, logger }),
    createIdentifySystemsTool({ core, logger }),
  ];

  for (const tool of streamsTools) {
    plugins.agentBuilder.tools.register(tool);
  }

  logger.debug(`Registered ${streamsTools.length} streams agent tools`);
}
