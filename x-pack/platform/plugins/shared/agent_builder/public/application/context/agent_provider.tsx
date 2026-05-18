/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { useQueryClient } from '@kbn/react-query';
import { useAgentBuilderAgentById } from '../hooks/agents/use_agent_by_id';
import { useAgentBuilderServices } from '../hooks/use_agent_builder_service';
import { queryKeys } from '../query_keys';

interface AgentContextType {
  agent: AgentDefinition | null;
  agentId: string;
  agentLoading: boolean;
  agentError: unknown;
  assignConnectorToAgent: (connector: ActionConnector) => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: React.ReactNode }) => {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent, isLoading: agentLoading, error: agentError } = useAgentBuilderAgentById(agentId);
  const { agentService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  const assignConnectorToAgent = useCallback(
    async (connector: ActionConnector) => {
      if (!agent) return;
      const currentIds = agent.configuration?.connector_ids ?? [];
      await agentService.update(agent.id, {
        configuration: { connector_ids: [...currentIds, connector.id] },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.byId(agent.id) });
    },
    [agent, agentService, queryClient]
  );

  return (
    <AgentContext.Provider
      value={{ agent, agentId: agentId ?? '', agentLoading, agentError, assignConnectorToAgent }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};
