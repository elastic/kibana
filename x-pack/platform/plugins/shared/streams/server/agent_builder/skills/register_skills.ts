/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { streamsManagementSkill } from './streams_management_skill';
import { knowledgeIndicatorsManagementSkill } from './knowledge_indicators_management';

export const registerAgentBuilderSkills = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  if (!agentBuilder) {
    return;
  }

  const streamsSkills = [streamsManagementSkill, knowledgeIndicatorsManagementSkill];

  for (const skill of streamsSkills) {
    agentBuilder.skills.register(skill);
  }
};
