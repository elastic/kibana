/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import uuid from 'uuid/v4';
import {
  AgentsRepository,
  Agent,
  SortOptions,
  NewAgent,
  AgentType,
  AgentAction,
  AgentActionType,
} from '../repositories/agents/types';
import { TokenLib } from './token';
import { PolicyLib } from './policy';
import { FullPolicyFile } from '../repositories/policies/types';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { AgentEventsRepository, AgentEvent } from '../repositories/agent_events/types';

export class AgentLib {
  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly agentEventsRepository: AgentEventsRepository,
    private readonly tokens: TokenLib,
    private readonly policy: PolicyLib
  ) {}

  /**
   * Enroll a new token into elastic fleet
   */
  public async enroll(
    user: FrameworkUser,
    token: any,
    type: AgentType,
    metadata?: { local: any; userProvided: any },
    sharedId?: string
  ): Promise<Agent> {
    const verifyResponse = await this.tokens.verify(user, token);

    if (!verifyResponse.valid) {
      throw Boom.unauthorized(`Enrollment token is not valid: ${verifyResponse.reason}`);
    }
    const policyId = verifyResponse.token.policy_id;

    const existingAgent = sharedId
      ? await this.agentsRepository.getBySharedId(user, sharedId)
      : null;

    if (existingAgent && existingAgent.active === true) {
      throw Boom.badRequest('Impossible to enroll an already active agent');
    }

    const enrolledAt = new Date().toISOString();

    const agentData: NewAgent = {
      shared_id: sharedId,
      active: true,
      policy_id: policyId,
      type,
      enrolled_at: enrolledAt,
      user_provided_metadata: metadata && metadata.userProvided,
      local_metadata: metadata && metadata.local,
    };

    let agent;
    if (existingAgent) {
      await this.agentsRepository.update(user, existingAgent.id, agentData);

      agent = {
        ...existingAgent,
        ...agentData,
      };
    } else {
      agent = await this.agentsRepository.create(user, agentData);
    }

    const accessToken = await this.tokens.generateAccessToken(agent.id, policyId);
    await this.agentsRepository.update(user, agent.id, {
      access_token: accessToken,
    });

    return { ...agent, access_token: accessToken };
  }

  public async unenrollForPolicy(user: FrameworkUser, policyId: string) {
    let hasMore = true;
    let page = 1;
    while (hasMore) {
      const { agents } = await this.agentsRepository.listForPolicy(user, policyId, {
        page: page++,
        perPage: 100,
      });

      if (agents.length === 0) {
        hasMore = false;
      }
      await this.unenroll(user, agents.map(a => a.id));
    }
  }

  public async unenroll(
    user: FrameworkUser,
    ids: string[]
  ): Promise<Array<{ id: string; success: boolean; error?: Error | Boom<null> }>> {
    const response = [];
    for (const id of ids) {
      try {
        await this.agentsRepository.update(user, id, {
          active: false,
        });
        response.push({
          id,
          success: true,
        });
      } catch (error) {
        response.push({
          id,
          error,
          success: false,
        });
      }
    }

    return response;
  }

  /**
   * Delete an agent
   */
  public async delete(user: FrameworkUser, agent: Agent) {
    if (agent.type === 'EPHEMERAL') {
      await this.agentEventsRepository.deleteEventsForAgent(user, agent.id);
      return await this.agentsRepository.delete(user, agent);
    }

    return await this.agentsRepository.update(user, agent.id, { active: false });
  }

  /**
   * Get an agent by id
   */
  public async getById(user: FrameworkUser, id: string): Promise<Agent | null> {
    return await this.agentsRepository.getById(user, id);
  }

  /**
   * Get events for a given agent
   */
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

  /**
   * Agent checkin, update events, get new actions to perfomed.
   * @param agent
   * @param events
   * @param metadata
   */
  public async checkin(
    user: FrameworkUser,
    agentId: string,
    events: AgentEvent[],
    localMetadata?: any
  ): Promise<{ actions: AgentAction[]; policy: FullPolicyFile }> {
    const agent = await this.agentsRepository.getById(user, agentId);

    if (!agent) {
      throw Boom.notFound('Agent not found or inactive');
    }

    if (!agent.active) {
      throw Boom.forbidden('Agent inactive');
    }

    const actions = this._filterActionsForCheckin(agent);

    const now = new Date().toISOString();
    const updatedActions = actions.map(a => {
      return { ...a, sent_at: now };
    });

    const updateData: Partial<Agent> = {
      last_checkin: now,
      actions: updatedActions,
    };

    if (localMetadata) {
      updateData.local_metadata = localMetadata;
    }

    const policy = await this.policy.getFullPolicy(agent.policy_id);
    await this.agentsRepository.update(user, agent.id, updateData);
    if (events.length > 0) {
      await this.agentEventsRepository.createEventsForAgent(user, agent.id, events);
    }

    return { actions, policy };
  }

  public async addAction(
    user: FrameworkUser,
    agentId: string,
    actionData: { type: AgentActionType }
  ) {
    const agent = await this.agentsRepository.getById(user, agentId);

    if (!agent || !agent.active) {
      throw Boom.notFound('Agent not found or inactive');
    }

    const action: AgentAction = {
      ...actionData,
      id: uuid(),
      created_at: new Date().toISOString(),
    };

    await this.agentsRepository.update(user, agent.id, {
      actions: [action].concat(agent.actions),
    });

    return action;
  }

  /**
   * List agents
   *
   * @param sortOptions
   * @param page
   * @param perPage
   */
  public async list(
    user: FrameworkUser,
    options: {
      showInactive?: boolean;
      sortOptions?: SortOptions;
      kuery?: string;
      page?: number;
      perPage?: number;
    } = {
      showInactive: false,
      sortOptions: SortOptions.EnrolledAtDESC,
    }
  ): Promise<{ agents: Agent[]; total: number; page: number; perPage: number }> {
    return this.agentsRepository.list(user, options);
  }

  public _filterActionsForCheckin(agent: Agent): AgentAction[] {
    return agent.actions.filter(a => !a.sent_at);
  }
}
