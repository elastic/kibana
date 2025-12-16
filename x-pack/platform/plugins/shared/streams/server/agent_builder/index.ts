/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import type { StreamsPluginStartDependencies } from '../types';
import { createStreamAttachmentType } from './attachments';
import {
  createSuggestPartitionsTool,
  createSuggestPipelineTool,
  createGetProcessingStepsTool,
  createSuggestGrokPatternTool,
  createSuggestDissectPatternTool,
  createGetStreamlangDocsTool,
  createSimulatePipelineTool,
} from './tools';

export {
  STREAMS_ATTACHMENT_TYPE_ID,
  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  STREAMS_SUGGEST_PIPELINE_TOOL_ID,
  STREAMS_GET_PROCESSING_STEPS_TOOL_ID,
  STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID,
  STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID,
  STREAMS_GET_STREAMLANG_DOCS_TOOL_ID,
  STREAMS_SIMULATE_PIPELINE_TOOL_ID,
} from './constants';
export { streamAttachmentDataSchema } from './attachments';
export type { StreamAttachmentData } from './attachments';

/**
 * Registers all streams-related tools and attachments with the onechat plugin.
 */
export function registerAgentBuilderIntegration({
  core,
  onechat,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  onechat: OnechatPluginSetup;
  logger: Logger;
}) {
  const agentBuilderLogger = logger.get('agent-builder');

  // Register the stream attachment type
  onechat.attachments.registerType(createStreamAttachmentType());
  agentBuilderLogger.debug('Registered streams attachment type');

  // Register all tools
  const tools = [
    { create: createSuggestPartitionsTool, name: 'partition suggestions' },
    { create: createSuggestPipelineTool, name: 'pipeline suggestions' },
    { create: createGetProcessingStepsTool, name: 'processing steps' },
    { create: createSuggestGrokPatternTool, name: 'grok pattern suggestions' },
    { create: createSuggestDissectPatternTool, name: 'dissect pattern suggestions' },
    { create: createSimulatePipelineTool, name: 'pipeline simulation' },
    { create: createGetStreamlangDocsTool, name: 'streamlang documentation' },
  ];

  for (const { create, name } of tools) {
    onechat.tools.register(create({ core, logger: agentBuilderLogger }));
    agentBuilderLogger.debug(`Registered streams ${name} tool`);
  }
}
