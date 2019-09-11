/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  AgentAdapter,
  Agent,
  SortOptions,
  NewAgent,
  AgentType,
  AgentEvent,
  AgentAction,
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
    const policy = verifyResponse.token.policy;

    const existingAgent = sharedId ? await this.agentAdater.getBySharedId(sharedId) : null;

    if (existingAgent && existingAgent.active === true) {
      throw new Error('Impossible to enroll an already active agent');
    }

    const enrolledAt = new Date().toISOString();

    const parentId =
      type === 'EPHEMERAL_INSTANCE'
        ? (await this._createParentForEphemeral(policy.id, policy.sharedId)).id
        : undefined;

    const agentData: NewAgent = {
      shared_id: sharedId,
      active: true,
      policy_id: policy.id,
      policy_shared_id: policy.sharedId,
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

    const accessToken = await this.tokens.generateAccessToken(agent.id, policy);
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
   * Agent checkin, update events, get new actions to perfomed.
   * @param agent
   * @param events
   * @param metadata
   */
  public async checkin(
    agentId: string,
    events: AgentEvent[],
    localMetadata?: any
  ): Promise<{ actions: AgentAction[] }> {
    const agent = await this.agentAdater.getById(agentId);

    if (!agent || !agent.active) {
      throw Boom.notFound('Agent not found or inactive');
    }

    const actions = this._filterActionsForCheckin(agent);

    const now = new Date().toISOString();
    const updatedActions = actions.map(a => {
      return { ...a, sent_at: now };
    });

    const updateData: Partial<Agent> = {
      events: events.concat(agent.events),
      last_checkin: now,
      actions: updatedActions,
    };

    if (localMetadata) {
      updateData.local_metadata = localMetadata;
    }

    await this.agentAdater.update(agent.id, updateData);

    return { actions };
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

  public _filterActionsForCheckin(agent: Agent): AgentAction[] {
    return agent.actions.filter(a => !a.sent_at);
  }

  private async _createParentForEphemeral(
    policyId: string,
    policySharedId: string
  ): Promise<Agent> {
    const ephemeralParentId = `agents:ephemeral:${policySharedId}`;
    const parentAgent = await this.agentAdater.getById('ephemeralParentId');

    if (parentAgent) {
      return parentAgent;
    }

    return await this.agentAdater.create(
      {
        type: 'EPHEMERAL',
        policy_id: policyId,
        policy_shared_id: policySharedId,
        active: true,
      },
      {
        id: ephemeralParentId,
        overwrite: true,
      }
    );
  }
}
