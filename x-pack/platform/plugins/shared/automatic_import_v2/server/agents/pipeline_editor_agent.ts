/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { PIPELINE_EDITOR_AGENT_PROMPT } from './prompts';
import { AutomaticImportAgentState } from './state';

const AGENT_RECURSION_LIMIT = 50;

export interface PipelineEditorAgentParams {
  model: InferenceChatModel;
  tools: StructuredTool[];
}

export const createPipelineEditorAgent = ({ model, tools }: PipelineEditorAgentParams) => {
  const stateSchema = AutomaticImportAgentState;

  const baseAgent = createReactAgent<typeof stateSchema, typeof AutomaticImportAgentState>({
    name: 'pipeline_editor_agent',
    llm: model,
    tools: tools as any,
    stateSchema,
    messageModifier: PIPELINE_EDITOR_AGENT_PROMPT,
  });

  return baseAgent.withConfig({
    recursionLimit: AGENT_RECURSION_LIMIT,
  });
};
