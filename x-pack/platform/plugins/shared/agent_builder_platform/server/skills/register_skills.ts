/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import { agentBuilderTracesSkill } from './agent_builder_traces/agent_builder_traces_skill';
import { graphCreationSkill } from './graph_creation_skill';
import { skillManagementSkill } from './skill_management';
import { connectorAuthoringSkill } from './connector_authoring';
import { kiRetrievalSkill } from './ki_retrieval';
import { analyzeAndImproveSkill } from './analyze_and_improve';
import { contextEngineSignalsSkill } from './context_engine_signals';
import { aiIndexSourcesSkill } from './ai_index_sources';
import { aiIndexAutomationsSkill } from './ai_index_automations';
import { loadElasticSkills } from './elastic_skills';

export const registerSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  getActionsStart: () => Promise<ActionsPluginStart>,
  logger: Logger
) => {
  agentBuilder.skills.register(graphCreationSkill);
  agentBuilder.skills.register(skillManagementSkill);
  agentBuilder.skills.register(agentBuilderTracesSkill);
  agentBuilder.skills.register(connectorAuthoringSkill({ getActionsStart }));
  agentBuilder.skills.register(kiRetrievalSkill);
  agentBuilder.skills.register(analyzeAndImproveSkill);
  agentBuilder.skills.register(contextEngineSignalsSkill);
  agentBuilder.skills.register(aiIndexSourcesSkill);
  agentBuilder.skills.register(aiIndexAutomationsSkill);

  loadElasticSkills({ logger: logger.get('elastic-skills') }).forEach((skill) => {
    agentBuilder.skills.register(skill);
  });
};
