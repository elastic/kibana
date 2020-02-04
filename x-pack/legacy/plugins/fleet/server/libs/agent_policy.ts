/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentsRepository } from '../repositories/agents/types';

/**
 * This is the server lib to manage everything related to policies and agents
 */
export class AgentPolicyLib {
  constructor(private readonly agentsRepository: AgentsRepository) {}

  public async updateAgentsForPolicyId(user: FrameworkUser, policyId: string) {
    let hasMore = true;
    let page = 1;
    const now = new Date().toISOString();
    while (hasMore) {
      const { agents } = await this.agentsRepository.listForPolicy(user, policyId, {
        page: page++,
        perPage: 1000,
      });
      if (agents.length === 0) {
        hasMore = false;
        break;
      }
      const agentUpdate = agents.map(agent => ({
        id: agent.id,
        newData: { config_updated_at: now },
      }));

      await this.agentsRepository.bulkUpdate(user, agentUpdate);
    }
  }
}
