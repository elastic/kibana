/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentEventsRepository } from '../repositories/agent_events/default';
import { Agent } from '../repositories/agents/types';
import { AgentEvent } from '../../common/types/domain_data';

/**
 * This is the server lib to manage everything related to policies and agents
 */
export class AgentEventLib {
  constructor(private readonly agentEventsRepository: AgentEventsRepository) {}

  /**
   * This function process and persit events during agent checkin,
   * looking at acknowledge action or errors reported by agents
   */
  public async processEventsForCheckin(user: FrameworkUser, agent: Agent, events: AgentEvent[]) {
    const acknowledgedActionIds: string[] = [];
    const updatedErrorEvents = [...agent.current_error_events];
    for (const event of events) {
      event.policy_id = agent.policy_id;

      if (isActionEvent(event)) {
        acknowledgedActionIds.push(event.action_id as string);
      }

      if (isErrorOrState(event)) {
        // Remove any global or specific to a stream event
        const existingEventIndex = updatedErrorEvents.findIndex(
          e => e.stream_id === event.stream_id
        );
        if (existingEventIndex >= 0) {
          updatedErrorEvents.splice(existingEventIndex, 1);
        }
        if (event.type === 'ERROR') {
          updatedErrorEvents.push(event);
        }
      }
    }

    if (events.length > 0) {
      await this.agentEventsRepository.createEventsForAgent(user, agent.id, events);
    }

    return {
      acknowledgedActionIds,
      updatedErrorEvents,
    };
  }

  public async getEventsCountForPolicyId(user: FrameworkUser<any>, policyId: string) {
    const { total } = await this.agentEventsRepository.list(user, {
      perPage: 0,
      search: `agent_events.policy_id:${policyId}`,
    });

    return total;
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

function isErrorOrState(event: AgentEvent) {
  return event.type === 'STATE' || event.type === 'ERROR';
}

function isActionEvent(event: AgentEvent) {
  return (
    event.type === 'ACTION' && (event.subtype === 'ACKNOWLEDGED' || event.subtype === 'UNKNOWN')
  );
}
