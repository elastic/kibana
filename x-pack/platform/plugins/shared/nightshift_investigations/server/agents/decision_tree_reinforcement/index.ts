/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { buildReinforcementSystemPrompt } from '@kbn/nightshift-decision-trees';
import { NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID } from '@kbn/workflows/managed';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';
import { DECISION_TREE_PROMPT_TOOLS, DECISION_TREE_TOOL_IDS } from '../../tools/decision_tree';

export const NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID =
  'significant-events.decision-tree-reinforcement';
export const NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID =
  'platform.sig_events.decision-tree-reinforcement-type';

/**
 * Only the file tools, deliberately. The agent reasons from the transcript it is handed, so bash
 * and telemetry access would let it re-investigate instead of distilling what already happened.
 */
const SANDBOX_FILE_TOOL_IDS = [
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
] as const;

export const DECISION_TREE_REINFORCEMENT_AGENT_NAME = 'Nightshift Decision Tree Reinforcement';
export const DECISION_TREE_REINFORCEMENT_AGENT_DESCRIPTION =
  'Distills a finished investigation into a reusable Mermaid decision tree, merging this run ' +
  'into the existing tree for the symptom and recording what a human had to correct.';

/**
 * Builds the decision-tree reinforcement agent type. It runs after an investigation rather than
 * during one: the reinforce workflow hands it the round's transcript, its own beforeAgent hook
 * materializes the stored trees into `/workspace/decision-trees`, and it edits them with the
 * sandbox file tools before `submit_optimizer_result` validates and persists the result.
 */
export const getDecisionTreeReinforcementAgentType = (): AgentTypeDefinition => ({
  id: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_TYPE_ID,
  name: DECISION_TREE_REINFORCEMENT_AGENT_NAME,
  description: DECISION_TREE_REINFORCEMENT_AGENT_DESCRIPTION,
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: buildReinforcementSystemPrompt(DECISION_TREE_PROMPT_TOOLS),
    skill_ids: [],
    tools: [{ tool_ids: [...SANDBOX_FILE_TOOL_IDS, ...DECISION_TREE_TOOL_IDS] }],
    enable_elastic_capabilities: false,
    connector_ids: [],
    // Hydration has to run inside this agent's own conversation: the sandbox workspace is
    // namespaced per conversation, and this agent runs in a different one than the investigator.
    workflow_ids: [NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID],
  },
});

export const registerDecisionTreeReinforcementAgentType = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.agents.registerType(getDecisionTreeReinforcementAgentType());
};
