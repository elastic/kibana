/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAgentBuilderAgents } from '../agents/use_agents';

export const useConnectorUsedByAgents = ({
  connectorId,
  currentAgentId,
}: {
  connectorId: string;
  currentAgentId: string;
}) => {
  const { agents, isLoading, error } = useAgentBuilderAgents();

  const usedByAgents = useMemo(
    () =>
      agents.filter(
        (agent) =>
          agent.id !== currentAgentId &&
          (agent.configuration?.connector_ids === undefined ||
            agent.configuration?.connector_ids === null ||
            agent.configuration.connector_ids.includes(connectorId))
      ),
    [agents, connectorId, currentAgentId]
  );

  return { usedByAgents, isLoading, error };
};
