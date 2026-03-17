/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { MemoryServiceImpl, SuggestionServiceImpl } from '../services';
import { knowledgeMemorySearchTool } from './knowledge_memory_search';
import { knowledgeMemoryReadTool } from './knowledge_memory_read';

export const registerTools = ({
  agentBuilder,
  getServices,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getServices: () => {
    memoryService: MemoryServiceImpl;
    suggestionService: SuggestionServiceImpl;
  };
}) => {
  agentBuilder.tools.register(knowledgeMemorySearchTool(getServices));
  agentBuilder.tools.register(knowledgeMemoryReadTool(getServices));
};
