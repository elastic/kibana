/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { AgentEventsRepository as AgentEventsRepositoryType, AgentEvent } from './types';

/**
 * In memory agent events repository for test purposes only
 */
export class InMemoryAgentEventsRepository implements AgentEventsRepositoryType {
  private events: Array<{ agentId: string; event: AgentEvent }> = [];
  public async createEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    events: AgentEvent[]
  ): Promise<void> {
    for (const event of events) {
      this.events.push({
        agentId,
        event: { ...event },
      });
    }
  }
  public async getEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    page: number = 1,
    perPage: number = 25
  ) {
    const allItems = this.events.filter(e => e.agentId === agentId);

    const items = allItems.slice((page - 1) * perPage, page * perPage).map(e => ({ ...e.event }));

    return { items, total: allItems.length };
  }

  public async deleteEventsForAgent(user: FrameworkUser, agentId: string): Promise<void> {
    this.events = this.events.filter(e => e.agentId !== agentId);
  }
}
