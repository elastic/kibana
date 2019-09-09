/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentAdapter, Agent, NewAgent } from './adapter_type';

/**
 * In memory adapter, for testing purpose, all the created agents, are accessible under the public property agents
 */
export class InMemoryAgentAdapter implements AgentAdapter {
  public agents: { [k: string]: Agent } = {};
  private id = 1;

  public async create(
    agent: NewAgent,
    options: { id?: string; overwrite?: boolean }
  ): Promise<Agent> {
    const newAgent = {
      ...agent,
      id: (options && options.id) || `agent-${this.id++}`,
      last_updated: undefined,
      last_checkin: undefined,
      events: [],
      actions: [],
    };

    this.agents[newAgent.id] = newAgent;

    return newAgent;
  }

  public async delete(agent: Agent): Promise<void> {
    delete this.agents[agent.id];
  }

  public async getById(id: string): Promise<Agent | null> {
    return this.agents[id] || null;
  }

  public async getBySharedId(sharedId: string): Promise<Agent | null> {
    const agent = Object.values(this.agents).find(a => a.shared_id === sharedId);

    return agent || null;
  }

  public async update(id: string, newData: Partial<Agent>): Promise<void> {
    if (this.agents[id]) {
      Object.assign(this.agents[id], newData);
    }
  }

  public async findByMetadata(metadata: { local?: any; userProvided?: any }): Promise<Agent[]> {
    return [];
  }

  public async list(
    sortOptions: any,
    page: number = 1,
    perPage: number = 20
  ): Promise<{ agents: Agent[]; total: number }> {
    const start = (page - 1) * perPage;
    const agents = Object.values(this.agents).slice(start, start + perPage);
    const total = Object.keys(this.agents).length;

    return { agents, total };
  }

  public async findEphemeralByConfigSharedId(configSharedId: string): Promise<Agent | null> {
    const agent = Object.values(this.agents).find(
      a => a.type === 'EPHEMERAL' && a.config_shared_id === configSharedId
    );

    return agent || null;
  }

  public async getByEphemeralAccessToken(token: any): Promise<Agent | null> {
    return null;
  }
}
