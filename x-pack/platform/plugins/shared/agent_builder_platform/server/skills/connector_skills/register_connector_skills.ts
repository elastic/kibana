/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { AgentBuilderPluginSetup, AvailabilityConfig } from '@kbn/agent-builder-server';
import { hasWorkflowExecutePrivilege } from '@kbn/agent-builder-tools-base/workflows';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { CONNECTORS_SKILLS_BASE_PATH } from '@kbn/agent-builder-server/skills';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getAllConnectorSkills,
  getConnectorSkillRegistryId,
  type ConnectorTypeSkill,
} from '@kbn/connector-specs';
import { createListConnectorsTool } from '../connector_discovery/list_connectors_tool';

export interface ConnectorSkillsDeps {
  getActionsStart: () => Promise<ActionsPluginStart>;
  /** False when the Agent Builder Workflows plugin is disabled, so `execute_workflow` is not registered. */
  workflowsEnabled: boolean;
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
}

/**
 * Connector skills tell the model to run workflows, so they are only offered when the executor
 * can work: Workflows is enabled and the caller holds the Workflows execute privilege.
 */
export const createWorkflowExecutionAvailability = ({
  workflowsEnabled,
  getSecurity,
}: Pick<ConnectorSkillsDeps, 'workflowsEnabled' | 'getSecurity'>): AvailabilityConfig => ({
  // The privilege is per user, which no shared cache key covers.
  cacheMode: 'none',
  handler: async ({ request, spaceId }) => {
    if (!workflowsEnabled) {
      return { status: 'unavailable', reason: 'Workflows is disabled.' };
    }
    const canExecute = await hasWorkflowExecutePrivilege({
      security: await getSecurity(),
      request,
      spaceId,
    });
    return canExecute
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'The workflows execute privilege is missing.' };
  },
});

/** Builds the built-in skill definition for a skill defined by a connector spec. */
export const createConnectorSkillDefinition = (
  skill: ConnectorTypeSkill['skill'],
  { getActionsStart, workflowsEnabled, getSecurity }: ConnectorSkillsDeps
): SkillDefinition => ({
  id: getConnectorSkillRegistryId(skill),
  name: skill.name,
  basePath: CONNECTORS_SKILLS_BASE_PATH,
  description: skill.description,
  availability: createWorkflowExecutionAvailability({ workflowsEnabled, getSecurity }),
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
  // Lets the agent find the connector id to run the workflows with, without loading the connector
  // discovery skill first.
  getInlineTools: () => [createListConnectorsTool({ getActionsStart })],
});

/** Registers every skill defined by a connector spec as a built-in skill. */
export const registerConnectorSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: ConnectorSkillsDeps
) => {
  getAllConnectorSkills().forEach(({ skill }) => {
    agentBuilder.skills.register(createConnectorSkillDefinition(skill, deps));
  });
};
