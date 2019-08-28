/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  AgentAdapter,
  Agent,
  SortOptions,
  NewAgent,
  AgentType,
} from './adapters/agent/adapter_type';
import { TokenLib } from './token';

export class AgentLib {
  constructor(private readonly agentAdater: AgentAdapter, private readonly tokens: TokenLib) {}

  /**
   * Enroll a new token into elastic fleet
   */
  public async enroll(
    token: any,
    type: AgentType,
    metadata?: { local: any; userProvided: any },
    sharedId?: string
  ): Promise<Agent> {
    const verifyResponse = await this.tokens.verify(token);

    if (!verifyResponse.valid) {
      throw new Error(`Enrollment token is not valid: ${verifyResponse.reason}`);
    }
    const config = verifyResponse.token.config;

    const existingAgent = sharedId ? await this.agentAdater.getBySharedId(sharedId) : null;

    if (existingAgent && existingAgent.active === true) {
      throw new Error('Impossible to enroll an already active agent');
    }

    const enrolledAt = moment().toISOString();

    const parentId =
      type === 'EPHEMERAL_INSTANCE'
        ? (await this._createParentForEphemeral(config.id, config.sharedId)).id
        : undefined;

    const agentData: NewAgent = {
      shared_id: sharedId,
      active: true,
      config_id: config.id,
      config_shared_id: config.sharedId,
      type,
      enrolled_at: enrolledAt,
      parent_id: parentId,
      user_provided_metadata: metadata && metadata.userProvided,
      local_metadata: metadata && metadata.local,
    };

    let agent;
    if (existingAgent) {
      await this.agentAdater.update(existingAgent.id, agentData);

      agent = {
        ...existingAgent,
        ...agentData,
      };
    } else {
      agent = await this.agentAdater.create(agentData);
    }

    const accessToken = await this.tokens.generateAccessToken(agent.id, config);
    await this.agentAdater.update(agent.id, {
      access_token: accessToken,
    });

    return { ...agent, access_token: accessToken };
  }

  /**
   * Delete an agent
   */
  public async delete(agent: Agent) {
    if (agent.type === 'EPHEMERAL_INSTANCE') {
      return this.agentAdater.delete(agent);
    }

    return this.agentAdater.update(agent.id, { active: false });
  }

  /**
   * Get an agent by id
   */
  public async getById(id: string): Promise<Agent | null> {
    return await this.agentAdater.getById(id);
  }

  /**
   * List agents
   *
   * @param sortOptions
   * @param page
   * @param perPage
   */
  public async list(
    sortOptions: SortOptions = SortOptions.EnrolledAtDESC,
    page?: number,
    perPage?: number
  ): Promise<{ agents: Agent[]; total: number }> {
    return this.agentAdater.list(sortOptions, page, perPage);
  }

  private async _createParentForEphemeral(
    configId: string,
    configSharedId: string
  ): Promise<Agent> {
    const ephemeralParentId = `agents:ephemeral:${configSharedId}`;
    const parentAgent = await this.agentAdater.getById('ephemeralParentId');

    if (parentAgent) {
      return parentAgent;
    }

    return await this.agentAdater.create(
      {
        type: 'EPHEMERAL',
        config_id: configId,
        config_shared_id: configSharedId,
        active: true,
      },
      {
        id: ephemeralParentId,
        overwrite: true,
      }
    );
  }
}
