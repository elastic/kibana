/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentEventsRepository } from '../repositories/agent_events/default';
import { AgentEvent } from '../repositories/agent_events/types';

/**
 * This is the server lib to manage everything related to policies and agents
 */
export class AgentEventLib {
  constructor(private readonly agentEventsRepository: AgentEventsRepository) {}

  public async processEventsForCheckin(user: FrameworkUser, agentId: string, events: AgentEvent[]) {
    let acknowledgedActionIds: string[] = [];
    if (events.length > 0) {
      acknowledgedActionIds = events
        .filter(
          e => e.type === 'ACTION' && (e.subtype === 'ACKNOWLEDGED' || e.subtype === 'UNKNOWN')
        )
        .map(e => e.action_id as string);

      await this.agentEventsRepository.createEventsForAgent(user, agentId, events);
    }

    return {
      acknowledgedActionIds,
    };
  }

  public async deleteEventsForAgent(user: FrameworkUser, agentId: string) {
    await this.agentEventsRepository.deleteEventsForAgent(user, agentId);
  }

  public async getEventsById(
    user: FrameworkUser,
    agentId: string,
    search?: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<{ items: AgentEvent[]; total: number }> {
    return await this.agentEventsRepository.getEventsForAgent(user, agentId, {
      search,
      page,
      perPage,
    });
  }
}
