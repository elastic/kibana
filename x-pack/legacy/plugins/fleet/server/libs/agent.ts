/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import uuid from 'uuid/v4';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { Agent, AgentAction, AgentsRepository, SortOptions } from '../repositories/agents/types';
import { AgentPolicy } from '../repositories/policies/types';
import { ApiKeyLib } from './api_keys';
import { AgentStatusHelper } from './agent_status_helper';
import { AgentEventLib } from './agent_event';
import { AgentEvent, AgentType, NewAgent, AgentActionType } from '../../common/types/domain_data';

export class AgentLib {
  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly apiKeys: ApiKeyLib,
    private readonly agentEvents: AgentEventLib
  ) {}

  /**
   * Enroll a new agent into elastic fleet
   */
  public async enroll(
    user: FrameworkUser,
    type: AgentType,
    metadata?: { local: any; userProvided: any },
    sharedId?: string
  ): Promise<Agent> {
    const internalUser = this._getInternalUser();
    const verifyResponse = await this.apiKeys.verifyEnrollmentApiKey(user);

    if (!verifyResponse.valid) {
      throw Boom.unauthorized(`Enrollment apiKey is not valid: ${verifyResponse.reason}`);
    }
    const policyId = verifyResponse.enrollmentApiKey.policy_id;

    const existingAgent = sharedId
      ? await this.agentsRepository.getBySharedId(internalUser, sharedId)
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
      await this.agentsRepository.update(internalUser, existingAgent.id, agentData);

      agent = {
        ...existingAgent,
        ...agentData,
      };
    } else {
      agent = await this.agentsRepository.create(internalUser, agentData);
    }

    const accessApiKey = await this.apiKeys.generateAccessApiKey(agent.id, policyId);
    await this.agentsRepository.update(internalUser, agent.id, {
      access_api_key_id: accessApiKey.id,
    });

    return { ...agent, access_api_key: accessApiKey.key };
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
      await this.unenroll(
        user,
        agents.map(a => a.id)
      );
    }
  }

  public async update(
    user: FrameworkUser,
    agentId: string,
    data: {
      user_provided_metadata?: any;
    }
  ) {
    const agent = await this.getById(user, agentId);
    if (!agent) {
      throw Boom.notFound('Agent not found');
    }

    if (data.user_provided_metadata) {
      const localMetadataKeys = Object.keys(agent.local_metadata || {});

      const hasConflict = Object.keys(data.user_provided_metadata).find(
        k => localMetadataKeys.indexOf(k) >= 0
      );

      if (hasConflict) {
        throw Boom.badRequest(`It's not allowed to update local metadata (${hasConflict}).`);
      }
    }

    this.agentsRepository.update(user, agentId, data);
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
      await this.agentEvents.deleteEventsForAgent(user, agent.id);
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
   * Get an active agent by api key id
   */
  public async getActiveByApiKeyId(user: FrameworkUser, accessApiKeyId: string) {
    const agent = await this.agentsRepository.getByAccessApiKeyId(user, accessApiKeyId);
    if (!agent) {
      throw Boom.notFound('Agent not found or inactive');
    }
    if (!agent.active) {
      throw Boom.forbidden('Agent inactive');
    }
    return agent;
  }

  /**
   * Agent checkin, update events, get new actions to perfomed.
   * @param agent
   * @param events
   * @param metadata
   */
  public async checkin(
    user: FrameworkUser,
    agent: Agent,
    events: AgentEvent[],
    localMetadata?: any
  ): Promise<{ actions: AgentAction[]; policy: AgentPolicy | null }> {
    const internalUser = this._getInternalUser();

    const actions = this._filterActionsForCheckin(agent);

    const now = new Date().toISOString();

    const updateData: Partial<Agent> = {
      last_checkin: now,
    };

    if (localMetadata) {
      updateData.local_metadata = localMetadata;
    }

    const {
      acknowledgedActionIds,
      updatedErrorEvents,
    } = await this.agentEvents.processEventsForCheckin(internalUser, agent, events);

    if (acknowledgedActionIds.length > 0) {
      const updatedActions = actions.map(a => {
        return { ...a, sent_at: acknowledgedActionIds.indexOf(a.id) >= 0 ? now : undefined };
      });
      updateData.actions = updatedActions;
    }

    if (updatedErrorEvents) {
      updateData.current_error_events = updatedErrorEvents;
    }

    await this.agentsRepository.update(internalUser, agent.id, updateData);

    return { actions: updateData.actions || actions, policy: null };
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

  public async getAgentsStatusForPolicy(user: FrameworkUser, policyId: string) {
    const [all, error, offline] = await Promise.all(
      [
        undefined,
        AgentStatusHelper.buildKueryForErrorAgents(),
        AgentStatusHelper.buildKueryForOfflineAgents(),
      ].map(kuery => {
        return this.agentsRepository.listForPolicy(user, policyId, {
          perPage: 0,
          kuery,
        });
      })
    );

    return {
      events: await this.agentEvents.getEventsCountForPolicyId(user, policyId),
      total: all.total,
      online: all.total - error.total - offline.total,
      error: error.total,
      offline: offline.total,
    };
  }

  /**
   * List agents
   *
   * @param sortOptions
   *
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

  private _getInternalUser(): FrameworkUser {
    return {
      kind: 'internal',
    };
  }
}
