/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReturnTypeList } from '../../common/return_types';
import { Agent, AgentEvent } from '../../common/types/domain_data';
import { AgentAdapter } from './adapters/agent/memory_agent_adapter';

export class AgentsLib {
  constructor(private readonly adapter: AgentAdapter) {}

  /**
   * Get an agent by id
   * @param id
   */
  public async get(id: string): Promise<Agent | null> {
    const agent = await this.adapter.get(id);
    return agent;
  }

  /**
   * Get an agent by id
   * @param id
   */
  public async getAgentEvents(
    id: string,
    page: number,
    perPage: number,
    kuery?: string
  ): Promise<{ total: number; list: AgentEvent[] }> {
    return await this.adapter.getAgentEvents(id, page, perPage, kuery);
  }

  /** Get a single agent using the token it was enrolled in for lookup */
  public getWithToken = async (enrollmentToken: string): Promise<Agent | null> => {
    const agent = await this.adapter.getWithToken(enrollmentToken);
    return agent;
  };

  /** Get an array of agents that have a given tag id assigned to it */
  public getOnPolicy = async (policyId: string): Promise<Agent[]> => {
    const agents = await this.adapter.getOnPolicy(policyId);
    return agents;
  };

  /** Get an array of all enrolled agents. */
  public getAll = async (
    page: number,
    perPage: number,
    kuery?: string,
    showInactive?: boolean
  ): Promise<ReturnTypeList<Agent>> => {
    return await this.adapter.getAll(page, perPage, kuery, showInactive);
  };

  /** Update a given agent via it's ID */
  public update = async (id: string, agentData: Partial<Agent>): Promise<boolean> => {
    return await this.adapter.update(id, agentData);
  };

  public unenroll = async (ids: string[]) => {
    return await this.adapter.unenrollByIds(ids);
  };

  public unenrollByKuery = async (kuery: string = '') => {
    return await this.adapter.unenrollByKuery(kuery);
  };
}
