/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { CONNECTORS_SKILLS_BASE_PATH } from '@kbn/agent-builder-server/skills';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getAllConnectorSkills,
  getConnectorSkillRegistryId,
  type ConnectorTypeSkill,
} from '@kbn/connector-specs';

/** Builds the built-in skill definition for a skill defined by a connector spec. */
export const createConnectorSkillDefinition = (
  skill: ConnectorTypeSkill['skill']
): SkillDefinition => ({
  id: getConnectorSkillRegistryId(skill),
  name: skill.name,
  basePath: CONNECTORS_SKILLS_BASE_PATH,
  description: skill.description,
  content: skill.content,
  referencedContent: skill.resources?.map(({ name, relativePath, content }) => ({
    name,
    relativePath,
    content,
  })),
  // Granted per agent at run time from the agent's connectors, so they stay out of the skills
  // library and out of the default capabilities.
  hidden: true,
  excludeFromElasticCapabilities: true,
  getRegistryTools: () => [platformCoreTools.executeWorkflow],
});

/** Registers every skill defined by a connector spec as a built-in skill. */
export const registerConnectorSkills = (agentBuilder: AgentBuilderPluginSetup) => {
  getAllConnectorSkills().forEach(({ skill }) => {
    agentBuilder.skills.register(createConnectorSkillDefinition(skill));
  });
};
