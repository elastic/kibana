/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Agent, SortOptions, NewAgent } from './adapters/agent/adapter_type';
import { AgentAdapter } from './adapters/agent/default';
import { TokenLib } from './token';

export class AgentLib {
  constructor(private readonly agentAdater: AgentAdapter, private readonly tokens: TokenLib) {}

  /**
   * Enroll a new token into elastic fleet
   */
  public async enroll(token: any, agentData: NewAgent): Promise<Agent> {
    const verifyResponse = await this.tokens.verify(token);
    if (!verifyResponse.valid) {
      throw new Error(`Enrollment token is not valid ${verifyResponse.reason}`);
    }

    const existingAgent = agentData.shared_id
      ? await this.agentAdater.getBySharedId(agentData.shared_id)
      : null;

    if (existingAgent && existingAgent.active === true) {
      throw new Error('Impossible to enroll an already active agent');
    }

    const accessToken = await this.tokens.generateAccessToken(token);
    const enrolledAt = moment().toISOString();

    const parentId =
      agentData.type === 'EPHEMERAL_INSTANCE'
        ? (await this._findOrCreateParentForEphemeral(agentData)).id
        : undefined;

    if (existingAgent) {
      await this.agentAdater.update(existingAgent.id, {
        ...agentData,
        access_token: accessToken,
        enrolled_at: enrolledAt,
        parent_id: parentId,
      });

      return {
        ...existingAgent,
        ...agentData,
      };
    }

    return await this.agentAdater.create({
      ...agentData,
      access_token: accessToken,
      enrolled_at: enrolledAt,
      parent_id: parentId,
    });
  }

  /**
   * Delete an agent
   */
  public async delete(agent: Agent) {
    if (agent.type === 'EPHEMERAL') {
      // TODO if we delete an ephemeral agent we probably want to delete all the EPHEMERAL INSTANCES associde to this agent
      return this.agentAdater.delete(agent);
    }
    if (agent.type === 'EPHEMERAL_INSTANCE') {
      return this.agentAdater.delete(agent);
    }

    return this.agentAdater.update(agent.id, { active: false });
  }

  /**
   * List agents
   *
   * @param sortOptions
   * @param page
   * @param perPage
   */
  public async list(sortOptions: SortOptions, page?: number, perPage?: number): Promise<Agent[]> {
    return this.agentAdater.list(sortOptions, page, perPage);
  }

  private async _findOrCreateParentForEphemeral(agent: NewAgent): Promise<Agent> {
    const parentAgent = await this.agentAdater.findEphemeralByConfigSharedId(
      agent.config_shared_id
    );

    if (parentAgent) {
      return parentAgent;
    }

    return await this.agentAdater.create({
      type: 'EPHEMERAL',
      config_id: agent.config_id,
      config_shared_id: agent.config_shared_id,
      version: agent.version,
      active: true,
    });
  }
}
