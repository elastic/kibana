/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBulkCreateObject } from 'src/core/server';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/adapter_types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import {
  AgentEventsRepository as AgentEventsRepositoryType,
  AgentEvent,
  AgentEventSOAttributes,
} from './types';

const SO_TYPE = 'agent_events';

export class AgentEventsRepository implements AgentEventsRepositoryType {
  constructor(private readonly soAdapter: SODatabaseAdapter) {}
  public async createEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    events: AgentEvent[]
  ): Promise<void> {
    const objects: Array<SavedObjectsBulkCreateObject<AgentEventSOAttributes>> = events.map(
      eventData => {
        return {
          attributes: {
            agent_id: agentId,
            ...eventData,
            payload: eventData.payload ? JSON.stringify(eventData.payload) : undefined,
          },
          type: SO_TYPE,
        };
      }
    );

    await this.soAdapter.bulkCreate(user, objects);
  }
  public async getEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    page: number = 1,
    perPage: number = 25
  ) {
    const { total, saved_objects } = await this.soAdapter.find<AgentEventSOAttributes>(user, {
      type: SO_TYPE,
      search: agentId,
      searchFields: ['agent_id'],
      perPage,
      page,
    });

    const items: AgentEvent[] = saved_objects.map(so => {
      return {
        ...so.attributes,
        payload: so.attributes.payload ? JSON.parse(so.attributes.payload) : undefined,
      };
    });

    return { items, total };
  }

  public async deleteEventsForAgent(user: FrameworkUser, agentId: string): Promise<void> {
    let more = true;

    while (more === true) {
      const { saved_objects: events } = await this.soAdapter.find<AgentEventSOAttributes>(user, {
        type: SO_TYPE,
        fields: ['id'],
        search: agentId,
        searchFields: ['agent_id'],
        perPage: 1000,
      });
      if (events.length === 0) {
        more = false;
      }
      for (const event of events) {
        await this.soAdapter.delete(user, SO_TYPE, event.id);
      }
    }
  }
}
