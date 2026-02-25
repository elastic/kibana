/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { researchSkill } from './research_skill';

export const registerSkills = async (agentBuilder: AgentBuilderPluginSetup): Promise<void> => {
  await agentBuilder.skills.register(researchSkill);
};
