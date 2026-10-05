/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { useKibana } from '../../../common/lib/kibana';

const EMPTY: AgentDefinition[] = [];

export const useAgentBuilderAgents = () => {
  const {
    services: { agentBuilder },
  } = useKibana();

  const { data } = useQuery<AgentDefinition[]>(
    ['cases', 'agent-builder', 'agents'],
    () => (agentBuilder ? agentBuilder.agents.list() : Promise.resolve(EMPTY)),
    { enabled: Boolean(agentBuilder), staleTime: Infinity, refetchOnWindowFocus: false }
  );

  const agents = data ?? EMPTY;
  const nameById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);

  return { agents, nameById };
};
