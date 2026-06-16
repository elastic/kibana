/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentAccessControl, AgentDefinition } from '@kbn/agent-builder-common';
import type {
  AgentAccessControlUpdateRequest,
  AgentCreateRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../common/agents';
import type {
  AgentResponse,
  CreateAgentResponse,
  DeleteAgentResponse,
  GetAgentAccessControlResponse,
  GetAgentResponse,
  ListAgentResponse,
  UpdateAgentAccessControlResponse,
  UpdateAgentResponse,
} from '../../../common/http_api/agents';
import { publicApiPath } from '../../../common/constants';

const agentFromHttpResponse = ({
  access_control: accessControl,
  ...agent
}: AgentResponse): AgentDefinition => ({
  ...agent,
  accessControl,
});

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all agents
   */
  async list(options?: AgentListOptions): Promise<AgentDefinition[]> {
    const res = await this.http.get<ListAgentResponse>(`${publicApiPath}/agents`);
    return res.results.map(agentFromHttpResponse);
  }

  /**
   * Get a single agent by id
   */
  async get(id: string): Promise<AgentDefinition> {
    const res = await this.http.get<GetAgentResponse>(`${publicApiPath}/agents/${id}`);
    return agentFromHttpResponse(res);
  }

  /**
   * Create a new agent
   */
  async create(profile: AgentCreateRequest): Promise<AgentDefinition> {
    const { accessControl, ...restProfile } = profile;
    const res = await this.http.post<CreateAgentResponse>(`${publicApiPath}/agents`, {
      body: JSON.stringify({ ...restProfile, access_control: accessControl }),
    });
    return agentFromHttpResponse(res);
  }

  /**
   * Update an existing agent
   */
  async update(id: string, update: AgentUpdateRequest): Promise<AgentDefinition> {
    const { accessControl, ...restUpdate } = update;
    const res = await this.http.put<UpdateAgentResponse>(`${publicApiPath}/agents/${id}`, {
      body: JSON.stringify({ ...restUpdate, access_control: accessControl }),
    });
    return agentFromHttpResponse(res);
  }

  /**
   * Delete an agent by id
   */
  async delete(id: string): Promise<DeleteAgentResponse> {
    return await this.http.delete<DeleteAgentResponse>(`${publicApiPath}/agents/${id}`);
  }

  /**
   * Get access control for an agent. Callers without manage rights receive redacted entries.
   */
  async getAccessControl(id: string): Promise<GetAgentAccessControlResponse> {
    return await this.http.get<GetAgentAccessControlResponse>(
      `${publicApiPath}/agents/${id}/access_control`
    );
  }

  /**
   * Replace access-control entries for an agent.
   */
  async updateAccessControl(
    id: string,
    update: AgentAccessControlUpdateRequest
  ): Promise<AgentAccessControl> {
    return await this.http.put<UpdateAgentAccessControlResponse>(
      `${publicApiPath}/agents/${id}/access_control`,
      {
        body: JSON.stringify(update),
      }
    );
  }
}
