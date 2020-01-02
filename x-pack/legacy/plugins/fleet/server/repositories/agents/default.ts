/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { SavedObject } from 'src/core/server';
import {
  AGENT_POLLING_THRESHOLD_MS,
  AGENT_TYPE_EPHEMERAL,
  DEFAULT_AGENTS_PAGE_SIZE,
} from '../../../common/constants';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/adapter_types';
import {
  Agent,
  AgentsRepository as AgentsRepositoryType,
  ListOptions,
  SavedObjectAgentAttributes,
  SortOptions,
} from './types';
import { NewAgent } from '../../../common/types/domain_data';

const SO_TYPE = 'agents';

export class AgentsRepository implements AgentsRepositoryType {
  constructor(private readonly soAdapter: SODatabaseAdapter) {}

  /**
   * Create a new saved object agent
   * @param agent
   */
  public async create(
    user: FrameworkUser,
    agent: NewAgent,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<Agent> {
    const so = await this.soAdapter.create(
      user,
      SO_TYPE,
      {
        ...agent,
        local_metadata: JSON.stringify(agent.local_metadata || {}),
        user_provided_metadata: JSON.stringify(agent.user_provided_metadata || {}),
        actions: [],
      },
      options
    );

    return this._savedObjectToAgent({
      ...so,
      attributes: {
        id: so.id,
        ...so.attributes,
      },
    });
  }

  /**
   * Delete an agent saved object
   * @param agent
   */
  public async delete(user: FrameworkUser, agent: Agent) {
    await this.soAdapter.delete(user, SO_TYPE, agent.id);
  }

  /**
   * Get an agent by ES id
   * @param agent
   */
  public async getById(user: FrameworkUser, id: string): Promise<Agent | null> {
    const response = await this.soAdapter.get<SavedObjectAgentAttributes>(user, SO_TYPE, id);
    if (!response) {
      return null;
    }

    return this._savedObjectToAgent(response);
  }

  public async getByAccessApiKeyId(user: FrameworkUser, apiKeyId: string): Promise<Agent | null> {
    const response = await this.soAdapter.find<SavedObjectAgentAttributes>(user, {
      type: SO_TYPE,
      searchFields: ['access_api_key_id'],
      search: apiKeyId,
    });

    const agents = response.saved_objects.map(this._savedObjectToAgent);

    if (agents.length > 0) {
      return agents[0];
    }

    return null;
  }

  /**
   * Get an agent by ES shared_id
   * @param agent
   */
  public async getBySharedId(user: FrameworkUser, sharedId: string): Promise<Agent | null> {
    const response = await this.soAdapter.find<SavedObjectAgentAttributes>(user, {
      type: SO_TYPE,
      searchFields: ['shared_id'],
      search: sharedId,
    });

    const agents = response.saved_objects.map(this._savedObjectToAgent);

    if (agents.length > 0) {
      return agents[0];
    }

    return null;
  }

  /**
   * Update an agent
   *
   * @param id
   * @param newData
   */
  public async update(user: FrameworkUser, id: string, newData: Partial<Agent>) {
    const { local_metadata, user_provided_metadata, current_error_events, ...data } = newData;
    const updateData: Partial<SavedObjectAgentAttributes> = { ...data };

    if (newData.current_error_events) {
      updateData.current_error_events = JSON.stringify(newData.current_error_events);
    }
    if (newData.local_metadata) {
      updateData.local_metadata = JSON.stringify(newData.local_metadata);
    }
    if (newData.user_provided_metadata) {
      updateData.user_provided_metadata = JSON.stringify(newData.user_provided_metadata);
    }

    const { error } = await this.soAdapter.update(user, SO_TYPE, id, updateData);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Update an agent
   *
   * @param id
   * @param newData
   */
  public async bulkUpdate(
    user: FrameworkUser,
    updates: Array<{ id: string; newData: Partial<Agent> }>
  ) {
    const bulkUpdateData = updates.map(({ id, newData }) => {
      const { local_metadata, user_provided_metadata, current_error_events, ...data } = newData;
      const updateData: Partial<SavedObjectAgentAttributes> = { ...data };

      if (newData.current_error_events) {
        updateData.current_error_events = JSON.stringify(newData.current_error_events);
      }
      if (newData.local_metadata) {
        updateData.local_metadata = JSON.stringify(newData.local_metadata);
      }
      if (newData.user_provided_metadata) {
        updateData.user_provided_metadata = JSON.stringify(newData.user_provided_metadata);
      }

      return {
        id,
        attributes: updateData,
        type: SO_TYPE,
      };
    });

    await this.soAdapter.bulkUpdate(user, bulkUpdateData);
  }

  /**
   * Find an agent by metadata
   * @param metadata
   * @param providedMetadata
   */
  public async findByMetadata(
    user: FrameworkUser,
    metadata: { local?: any; userProvided?: any }
  ): Promise<Agent[]> {
    const search = []
      .concat(Object.values(metadata.local || {}), Object.values(metadata.userProvided || {}))
      .join(' ');

    // neet to play with saved object to know what it's possible to do here
    const res = await this.soAdapter.find<SavedObjectAgentAttributes>(user, {
      type: SO_TYPE,
      search,
    });

    return res.saved_objects.map(this._savedObjectToAgent).filter(agent => {
      return metadata.local
        ? isEqual(metadata.local, agent.local_metadata)
        : true && metadata.userProvided
        ? isEqual(metadata.userProvided, agent.user_provided_metadata)
        : true;
    });
  }

  /**
   * List agents
   */
  public async list(
    user: FrameworkUser,
    options: ListOptions = {}
  ): Promise<{ agents: Agent[]; total: number; page: number; perPage: number }> {
    const {
      page = 1,
      perPage = DEFAULT_AGENTS_PAGE_SIZE,
      kuery,
      showInactive = false,
      sortOptions = SortOptions.EnrolledAtDESC,
    } = options;

    const filters = [];

    if (kuery && kuery !== '') {
      // To ensure users dont need to know about SO data structure...
      filters.push(kuery.replace(/agents\./g, 'agents.attributes.'));
    }

    if (showInactive === false) {
      const agentActiveCondition = `agents.attributes.active:true AND not agents.attributes.type:${AGENT_TYPE_EPHEMERAL}`;
      const recentlySeenEphemeralAgent = `agents.attributes.active:true AND agents.attributes.type:${AGENT_TYPE_EPHEMERAL} AND agents.attributes.last_checkin > ${Date.now() -
        3 * AGENT_POLLING_THRESHOLD_MS}`;
      filters.push(`(${agentActiveCondition}) OR (${recentlySeenEphemeralAgent})`);
    }

    const { saved_objects, total } = await this.soAdapter.find<SavedObjectAgentAttributes>(user, {
      type: SO_TYPE,
      page,
      perPage,
      filter: _joinFilters(filters),
      ...this._getSortFields(sortOptions),
    });

    const agents: Agent[] = saved_objects.map(this._savedObjectToAgent);

    return {
      agents,
      total,
      page,
      perPage,
    };
  }

  public async listForPolicy(
    user: FrameworkUser,
    policyId: string,
    options: ListOptions = {}
  ): Promise<{ agents: Agent[]; total: number; page: number; perPage: number }> {
    return await this.list(user, {
      ...options,
      kuery: `(agents.policy_id:"${policyId}")${
        options.kuery && options.kuery !== '' ? ` AND (${options.kuery})` : ''
      }`,
    });
  }

  private _savedObjectToAgent(so: SavedObject<SavedObjectAgentAttributes>): Agent {
    if (so.error) {
      throw new Error(so.error.message);
    }

    return {
      id: so.id,
      ...so.attributes,
      current_error_events: so.attributes.current_error_events
        ? JSON.parse(so.attributes.current_error_events)
        : [],
      local_metadata: JSON.parse(so.attributes.local_metadata),
      user_provided_metadata: JSON.parse(so.attributes.user_provided_metadata),
    };
  }

  private _getSortFields(sortOption?: SortOptions) {
    switch (sortOption) {
      case SortOptions.EnrolledAtASC:
        return {
          sortField: 'enrolled_at',
          sortOrder: 'ASC',
        };
      case SortOptions.EnrolledAtDESC:
        return {
          sortField: 'enrolled_at',
          sortOrder: 'DESC',
        };
      default:
        return {};
    }
  }
}

function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}
