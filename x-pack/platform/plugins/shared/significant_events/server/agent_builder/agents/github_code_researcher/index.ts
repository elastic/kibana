/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import {
  GITHUB_CODE_RESEARCHER_AGENT_ID,
  GITHUB_RESEARCH_SKILL_IDS,
} from '../../tools/github/constants';
import instructions from './instructions.md.text';

export const githubCodeResearcherAgent = {
  id: GITHUB_CODE_RESEARCHER_AGENT_ID,
  name: 'GitHub Code Researcher',
  description:
    'Researches configured GitHub repositories at immutable revisions for Significant Events Code Intelligence.',
  labels: ['github', 'code-research', 'streams', 'significant-events'],
  avatar_icon: 'logoGithub',
  configuration: {
    instructions,
    tools: [],
    skill_ids: [...GITHUB_RESEARCH_SKILL_IDS],
    enable_elastic_capabilities: false,
  },
} as const satisfies BuiltInAgentDefinition;

export const registerGithubCodeResearcherAgent = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.register(githubCodeResearcherAgent);
};
