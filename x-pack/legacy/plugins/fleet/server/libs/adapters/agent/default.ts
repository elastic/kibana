/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { SavedObject } from 'src/core/server';
import { Agent, NewAgent, AgentAdapter as AgentAdapterType } from './adapter_type';
import { SODatabaseAdapter } from '../saved_objets_database/adapter_types';

function _savedObjectToAgent(so: SavedObject<Agent>) {
  if (so.error) {
    throw new Error(so.error.message);
  }
  return so.attributes;
}

export class AgentAdapter implements AgentAdapterType {
  constructor(private readonly soAdapter: SODatabaseAdapter) {}

  /**
   * Create a new saved object agent
   * @param agent
   */
  public async create(agent: NewAgent): Promise<Agent> {
    const { error, id, attributes } = await this.soAdapter.create('agents', {
      ...agent,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      ...attributes,
      id,
      last_updated: undefined,
      last_checkin: undefined,
    };
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
  public async getById(id: string) {
    const response = await this.soAdapter.get<Agent>('agents', id);
    if (!response) {
      return null;
    }
    const { error, attributes } = response;
    if (error) {
      throw new Error(error.message);
    }

    return attributes;
  }

  /**
   * Get an agent by ES shared_id
   * @param agent
   */
  public async getBySharedId(sharedId: string): Promise<Agent | null> {
    const response = await this.soAdapter.find<Agent>({
      type: 'agents',
      searchFields: ['shared_id'],
      search: sharedId,
    });

    const agents = response.saved_objects.map(_savedObjectToAgent);

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
    const { error } = await this.soAdapter.update('agents', id, newData);

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
    const res = await this.soAdapter.find<Agent>({
      type: 'agents',
      search,
    });
    return res.saved_objects.map(_savedObjectToAgent).filter(agent => {
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
  public async list(sortOptions: any, page?: number, perPage: number = 20): Promise<Agent[]> {
    const res = await this.soAdapter.find<Agent>({
      type: 'agents',
      page,
      perPage,
    });

    return res.saved_objects
      .map(_savedObjectToAgent)
      .filter(agent => agent.type !== 'EPHEMERAL_INSTANCE');
  }

  public async findEphemeralByConfigSharedId(configSharedId: string): Promise<Agent | null> {
    const res = await this.soAdapter.find<Agent>({
      type: 'agents',
      search: configSharedId,
      searchFields: ['config_shared_id'],
    });
    const agents = res.saved_objects
      .map(_savedObjectToAgent)
      .filter(agent => agent.type === 'EPHEMERAL');

    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * Get an agent by ephemeral access token
   * @param token
   */
  public async getByEphemeralAccessToken(token: any): Promise<Agent | null> {
    const res = await this.soAdapter.find<Agent>({
      type: 'agents',
      search: token,
      searchFields: ['access_token'],
    });

    const agents = res.saved_objects.map(_savedObjectToAgent);

    if (agents.length < 0) {
      return null;
    }

    return agents[0];
  }
}
