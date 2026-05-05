/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { graphCreationSkill } from './graph_creation_skill';
import { visualizationCreationSkill } from './visualization_creation_skill';

export const registerSkills = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.skills.register(visualizationCreationSkill);
  agentBuilder.skills.register(graphCreationSkill);
};
