/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { ClientTool } from '@langchain/core/tools';
import { createTaskTool } from './sub_agents';
import type { AutomaticImportAgentParams } from './types';
import { AUTOMATIC_IMPORT_AGENT_PROMPT } from './prompts';
import { AutomaticImportAgentState } from './state';

const AGENT_RECURSION_LIMIT = 100;

/**
 * Creates an automatic import agent with the given parameters.
 * The orchestrator only has the task tool — it delegates all data retrieval
 * and pipeline work to sub-agents.
 *
 * @param params - The parameters for the automatic import agent
 * @returns The automatic import agent
 */
export const createAutomaticImportAgent = (params: AutomaticImportAgentParams) => {
  const { model, subagents, samples } = params;

  const stateSchema = AutomaticImportAgentState;

  const taskTool = createTaskTool({
    subagents,
    model,
    samples,
    recursionLimit: AGENT_RECURSION_LIMIT,
  });

  const allTools: ClientTool[] = [taskTool];

  const baseAgent = createReactAgent<typeof stateSchema, typeof AutomaticImportAgentState>({
    name: 'automatic_import_agent',
    llm: model,
    tools: allTools,
    stateSchema,
    prompt: AUTOMATIC_IMPORT_AGENT_PROMPT,
  });

  return baseAgent.withConfig({
    recursionLimit: AGENT_RECURSION_LIMIT,
  });
};
