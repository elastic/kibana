/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import { createTaskTool } from './sub_agents';
import { fetchUniqueKeysTool } from './tools/fetch_unique_keys';
import { fetchCurrentPipelineTool } from './tools/fetch_current_pipeline';
import type { AutomaticImportAgentParams } from './types';
import { AUTOMATIC_IMPORT_AGENT_PROMPT } from './prompts';
import { AutomaticImportAgentState } from './state';

const AGENT_RECURSION_LIMIT = 100;

/**
 * Creates an automatic import agent with the given parameters.
 * Subagents can be provided to customize behavior, including passing
 * pre-configured agents with samples (without storing samples in context).
 *
 * @param params - The parameters for the automatic import agent
 * @returns The automatic import agent
 */
export const createAutomaticImportAgent = (params: AutomaticImportAgentParams) => {
  const { model, subagents } = params;

  const stateSchema = AutomaticImportAgentState;
  const allTools: StructuredTool[] = [];

  const uniqueKeysTool = fetchUniqueKeysTool();
  allTools.push(uniqueKeysTool);

  const currentPipelineTool = fetchCurrentPipelineTool();
  allTools.push(currentPipelineTool);

  const taskTool = createTaskTool({
    subagents,
    model,
    recursionLimit: AGENT_RECURSION_LIMIT,
  });
  allTools.push(taskTool);

  // Return createReactAgent with proper configuration
  const baseAgent = createReactAgent<typeof stateSchema, typeof AutomaticImportAgentState>({
    name: 'automatic_import_agent',
    llm: model,
    tools: allTools as any, // TypeScript workaround to appease the expected type
    stateSchema,
    messageModifier: AUTOMATIC_IMPORT_AGENT_PROMPT,
  });

  return baseAgent.withConfig({
    recursionLimit: AGENT_RECURSION_LIMIT,
  });
};
