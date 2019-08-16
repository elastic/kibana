/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { SavedObject } from 'src/core/server';
import {
  Agent,
  NewAgent,
  AgentAdapter as AgentAdapterType,
  SortOptions,
  SavedObjectAgentAttributes,
} from './adapter_type';
import { SODatabaseAdapter } from '../saved_objets_database/adapter_types';

export class AgentAdapter implements AgentAdapterType {
  constructor(private readonly soAdapter: SODatabaseAdapter) {}

  /**
   * Create a new saved object agent
   * @param agent
   */
  public async create(
    agent: NewAgent,
    options?: { id?: string; overwrite?: boolean }
  ): Promise<Agent> {
    const so = await this.soAdapter.create(
      'agents',
      {
        ...agent,
        local_metadata: JSON.stringify(agent.local_metadata || {}),
        user_provided_metadata: JSON.stringify(agent.user_provided_metadata || {}),
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
  public async delete(agent: Agent) {
    await this.soAdapter.delete('agents', agent.id);
  }

  /**
   * Get an agent by ES id
   * @param agent
   */
  public async getById(id: string): Promise<Agent | null> {
    const response = await this.soAdapter.get<SavedObjectAgentAttributes>('agents', id);
    if (!response) {
      return null;
    }

    return this._savedObjectToAgent(response);
  }

  /**
   * Get an agent by ES shared_id
   * @param agent
   */
  public async getBySharedId(sharedId: string): Promise<Agent | null> {
    const response = await this.soAdapter.find<SavedObjectAgentAttributes>({
      type: 'agents',
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
  public async update(id: string, newData: Partial<Agent>) {
    const { error } = await this.soAdapter.update('agents', id, {
      ...newData,
      local_metadata: newData.local_metadata ? JSON.stringify(newData.local_metadata) : undefined,
      user_provided_metadata: newData.local_metadata
        ? JSON.stringify(newData.user_provided_metadata)
        : undefined,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Find an agent by metadata
   * @param metadata
   * @param providedMetadata
   */
  public async findByMetadata(metadata: { local?: any; userProvided?: any }): Promise<Agent[]> {
    const search = []
      .concat(Object.values(metadata.local || {}), Object.values(metadata.userProvided || {}))
      .join(' ');

    // neet to play with saved object to know what it's possible to do here
    const res = await this.soAdapter.find<SavedObjectAgentAttributes>({
      type: 'agents',
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
    sortOptions?: SortOptions,
    page?: number,
    perPage: number = 20
  ): Promise<{ agents: Agent[]; total: number }> {
    const { saved_objects, total } = await this.soAdapter.find<SavedObjectAgentAttributes>({
      type: 'agents',
      page,
      perPage,
      ...this._getSortFields(sortOptions),
    });

    const agents: Agent[] = saved_objects
      .map(this._savedObjectToAgent)
      .filter(agent => agent.type !== 'EPHEMERAL_INSTANCE');

    return {
      agents,
      total,
    };
  }

  public async findEphemeralByConfigSharedId(configSharedId: string): Promise<Agent | null> {
    const res = await this.soAdapter.find<SavedObjectAgentAttributes>({
      type: 'agents',
      search: configSharedId,
      searchFields: ['config_shared_id'],
    });
    const agents = res.saved_objects
      .map(this._savedObjectToAgent)
      .filter(agent => agent.type === 'EPHEMERAL');

    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * Get an agent by ephemeral access token
   * @param token
   */
  public async getByEphemeralAccessToken(token: any): Promise<Agent | null> {
    const res = await this.soAdapter.find<SavedObjectAgentAttributes>({
      type: 'agents',
      search: token,
      searchFields: ['access_token'],
    });

    const agents = res.saved_objects.map(this._savedObjectToAgent);

    if (agents.length < 0) {
      return null;
    }

    return agents[0];
  }
  private _savedObjectToAgent(so: SavedObject<SavedObjectAgentAttributes>): Agent {
    if (so.error) {
      throw new Error(so.error.message);
    }

    return {
      id: so.id,
      ...so.attributes,
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
