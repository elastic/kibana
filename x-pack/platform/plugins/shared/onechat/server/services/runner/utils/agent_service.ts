/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentService, AgentKnowledgeRegistry } from '@kbn/onechat-server/runner';
import type { AgentsServiceStart } from '../../agents/types';

export const createAgentService = async ({
  agentsStart,
}: {
  agentsStart: AgentsServiceStart;
}): Promise<AgentService> => {
  const internalRegistry = await agentsStart.getKnowledgeRegistry();

  const knowledgeRegistry: AgentKnowledgeRegistry = {
    get: (id) => {
      return internalRegistry.get(id);
    },
  };

  return {
    knowledge: knowledgeRegistry,
  };
};
