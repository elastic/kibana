/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentsRepository, AgentAction } from '../repositories/agents/types';
import { PolicyLib } from './policy';
import { AgentPolicy } from '../repositories/policies/types';

/**
 * This is the server lib to manage everything related to policies and agents
 */
export class AgentPolicyLib {
  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly policies: PolicyLib
  ) {}

  public async updateAgentForPolicyId(user: FrameworkUser, policyId: string, agentId: string) {
    const policy = await this.policies.getFullPolicy(user, policyId);
    const agent = await this.agentsRepository.getById(user, agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    await this.agentsRepository.update(user, agent.id, {
      actions: [...agent.actions, this._createPolicyChangeAction(policy)],
    });
  }

  public async updateAgentsForPolicyId(user: FrameworkUser, policyId: string) {
    let hasMore = true;
    let page = 1;
    const policy = await this.policies.getFullPolicy(user, policyId);
    while (hasMore) {
      const { agents } = await this.agentsRepository.listForPolicy(user, policyId, {
        page: page++,
        perPage: 100,
      });
      if (agents.length === 0) {
        hasMore = false;
      }

      const agentUpdate = agents.map(agent => {
        return {
          id: agent.id,
          newData: { actions: [...agent.actions, this._createPolicyChangeAction(policy)] },
        };
      });

      this.agentsRepository.bulkUpdate(user, agentUpdate);
    }
  }

  private _createPolicyChangeAction(policy: AgentPolicy | null): AgentAction {
    return {
      id: uuid.v4(),
      type: 'POLICY_CHANGE',
      created_at: new Date().toISOString(),
      data: JSON.stringify({
        policy,
      }),
    };
  }
}
