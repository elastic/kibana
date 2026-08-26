/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows';
import { AgentService } from '../services/agents';

const MAX_AGENT_SELECTION_OPTIONS = 20;

const TRANSLATIONS = {
  agentCanBeUsed: (agentName: string) =>
    i18n.translate('xpack.agentBuilder.runAgentStep.agentIdSelection.agentCanBeUsed', {
      defaultMessage: 'Agent "{agentName}" can be used',
      values: { agentName },
    }),
  agentNotFound: (agentId: string) =>
    i18n.translate('xpack.agentBuilder.runAgentStep.agentIdSelection.agentNotFound', {
      defaultMessage: 'Agent "{agentId}" not found',
      values: { agentId },
    }),
};

const toAgentSelectionOption = (agent: AgentDefinition): SelectionOption<string> => ({
  value: agent.id,
  label: agent.name,
  description: agent.description,
});

const matchesAgentQuery = (agent: AgentDefinition, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }

  return [agent.id, agent.name, agent.description, ...(agent.labels ?? [])].some((value) =>
    value.toLowerCase().includes(query)
  );
};

export function createAgentIdSelectionHandler(
  getHttp: () => Promise<HttpStart>
): PropertySelectionHandler<string> {
  return {
    search: async (input) => {
      try {
        const query = input.trim().toLowerCase();
        const agentService = new AgentService({ http: await getHttp() });
        const agents = await agentService.list();
        return agents
          .filter((agent) => matchesAgentQuery(agent, query))
          .slice(0, MAX_AGENT_SELECTION_OPTIONS)
          .map(toAgentSelectionOption);
      } catch {
        return [];
      }
    },

    resolve: async (value) => {
      const agentId = value.trim();
      if (agentId.length === 0) {
        return null;
      }

      try {
        const agentService = new AgentService({ http: await getHttp() });
        const agent = await agentService.get(agentId);
        return toAgentSelectionOption(agent);
      } catch {
        return null;
      }
    },

    getDetails: async (input, _context, option) => {
      if (option) {
        return { message: TRANSLATIONS.agentCanBeUsed(option.label ?? option.value) };
      }

      return { message: TRANSLATIONS.agentNotFound(input) };
    },
  };
}
