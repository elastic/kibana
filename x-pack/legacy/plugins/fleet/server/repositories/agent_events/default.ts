/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBulkCreateObject, SavedObjectsFindOptions } from 'src/core/server';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/adapter_types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import {
  AgentEventsRepository as AgentEventsRepositoryType,
  AgentEventSOAttributes,
} from './types';
import { AgentEvent } from '../../../common/types/domain_data';

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

  public async list(
    user: FrameworkUser,
    options: {
      agentId?: string;
      search?: string;
      page?: number;
      perPage?: number;
    } = {
      page: 1,
      perPage: 20,
    }
  ) {
    const { page, perPage, search } = options;

    const findOptions: SavedObjectsFindOptions = {
      type: SO_TYPE,
      filter:
        search && search !== ''
          ? search.replace(/agent_events\./g, 'agent_events.attributes.')
          : undefined,
      perPage,
      page,
      sortField: 'timestamp',
      sortOrder: 'DESC',
      defaultSearchOperator: 'AND',
    };

    if (options.agentId) {
      findOptions.search = options.agentId;
      findOptions.searchFields = ['agent_id'];
    }

    const { total, saved_objects } = await this.soAdapter.find<AgentEventSOAttributes>(
      user,
      findOptions
    );

    const items: AgentEvent[] = saved_objects.map(so => {
      return {
        ...so.attributes,
        payload: so.attributes.payload ? JSON.parse(so.attributes.payload) : undefined,
      };
    });

    return { items, total };
  }

  public async getEventsForAgent(
    user: FrameworkUser,
    agentId: string,
    options: {
      search?: string;
      page?: number;
      perPage?: number;
    } = {
      page: 1,
      perPage: 20,
    }
  ) {
    return this.list(user, {
      ...options,
      agentId,
    });
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
