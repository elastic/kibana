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
import {
  createSearchKnowledgeIndicatorsTool,
  STREAMS_SEARCH_KNOWLEDGE_INDICATORS_TOOL_ID,
} from './search_knowledge_indicators/tool';

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

  const streamsTools = [
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
