/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useAgentBuilderAgents } from './use_agents';

export const useValidateAgentId = () => {
  const { agents } = useAgentBuilderAgents();

  const agentIds = useMemo(() => new Set(agents.map((agent) => agent.id)), [agents]);

  const validateAgentId = useCallback(
    (agentId?: string): agentId is string => {
      if (!agentId) {
        return false;
      }
      return agentIds.has(agentId);
    },
    [agentIds]
  );

  return validateAgentId;
};
