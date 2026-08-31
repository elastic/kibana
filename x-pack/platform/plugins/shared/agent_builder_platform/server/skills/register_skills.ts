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
import { kiAutomationGenerationSkill } from './ki_automation_generation';
import { kiRetrievalSkill } from './ki_retrieval';
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
  agentBuilder.skills.register(kiAutomationGenerationSkill);
  agentBuilder.skills.register(kiRetrievalSkill);

  loadElasticSkills({ logger: logger.get('elastic-skills') }).forEach((skill) => {
    agentBuilder.skills.register(skill);
  });
};
