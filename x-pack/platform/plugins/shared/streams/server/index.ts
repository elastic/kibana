/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetup, StreamsPluginStart } from './plugin';
import type { StreamsRouteRepository } from './routes';
import type { AttachmentClient } from './lib/streams/attachments/attachment_client';
import type { StreamsClient } from './lib/streams/client';
import { config } from './config';
import { PromptsConfigService } from './lib/prompts/prompts_config_service';
import type { PromptsConfigAttributes } from './lib/prompts/prompts_config';

export type {
  StreamsConfig,
  StreamsPluginSetup,
  StreamsPluginStart,
  StreamsRouteRepository,
  AttachmentClient,
  StreamsClient,
  PromptsConfigAttributes,
};

export { PromptsConfigService };

export { config };

export const plugin = async (context: PluginInitializerContext<StreamsConfig>) => {
  const { StreamsPlugin } = await import('./plugin');
  return new StreamsPlugin(context);
};

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
} from './agent_builder/tools/tool_ids';
