/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
import type { AgentService } from './agents_service';

export const createPublicAgentsContract = ({
  agentService,
}: {
  agentService: AgentService;
}): AgentsServiceStartContract => {
  return {
    list: async () => {
      return agentService.list();
    },
    get: async (agentId) => {
      return agentService.get(agentId);
    },
    addSkillToAgent: async ({ agentId, skillId }) => {
      const agent = await agentService.get(agentId);
      const currentSkillIds = agent.configuration.skill_ids ?? [];
      if (currentSkillIds.includes(skillId)) {
        return agent;
      }
      return agentService.update(agentId, {
        configuration: { skill_ids: [...currentSkillIds, skillId] },
      });
    },
    addConnectorToAgent: async ({ agentId, connectorId }) => {
      const agent = await agentService.get(agentId);
      const currentConnectorIds = agent.configuration.connector_ids ?? [];
      if (currentConnectorIds.includes(connectorId)) {
        return agent;
      }
      return agentService.update(agentId, {
        configuration: { connector_ids: [...currentConnectorIds, connectorId] },
      });
    },
    removeConnectorFromAgent: async ({ agentId, connectorId }) => {
      const agent = await agentService.get(agentId);
      const currentConnectorIds = agent.configuration.connector_ids ?? [];
      if (!currentConnectorIds.includes(connectorId)) {
        return agent;
      }
      return agentService.update(agentId, {
        configuration: { connector_ids: currentConnectorIds.filter((id) => id !== connectorId) },
      });
    },
  };
};
