/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type { AgentAccessControl } from '@kbn/agent-builder-common';
import type {
  AgentAccessControlUpdateRequest,
  AgentCreateRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../common/agents';
import type {
  CreateAgentResponse,
  DeleteAgentResponse,
  GetAgentAccessControlResponse,
  GetAgentAiIndicesResponse,
  GetAgentResponse,
  ListAgentAiIndicesResponse,
  ListAgentResponse,
  ListAgentResponseItem,
  UpdateAgentAccessControlResponse,
  UpdateAgentResponse,
} from '../../../common/http_api/agents';
import { internalApiPath, publicApiPath } from '../../../common/constants';

/** Static, so it does not read as a dynamic http path. */
const AGENT_AI_INDICES_LIST_PATH = `${internalApiPath}/agents/_ai_indices`;
const AGENT_AI_INDICES_BY_ID_PATH = `${internalApiPath}/agents/{id}/_ai_indices`;

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all agents
   */
  async list(options?: AgentListOptions): Promise<ListAgentResponseItem[]> {
    const res = await this.http.get<ListAgentResponse>(`${publicApiPath}/agents`);
    return res.results;
  }

  /**
   * Get a single agent by id
   */
  async get(id: string): Promise<GetAgentResponse> {
    return await this.http.get<GetAgentResponse>(`${publicApiPath}/agents/${id}`);
  }

  /**
   * Lists the effective AI indices for each listed agent, with type-contributed ones flagged.
   */
  async listAgentAiIndices(): Promise<ListAgentAiIndicesResponse> {
    return await this.http.get<ListAgentAiIndicesResponse>(AGENT_AI_INDICES_LIST_PATH);
  }

  /**
   * Returns the effective AI indices for one agent, with type-contributed ones flagged.
   */
  async getAgentAiIndices(id: string): Promise<GetAgentAiIndicesResponse> {
    return await this.http.get<GetAgentAiIndicesResponse>(
      buildPath(AGENT_AI_INDICES_BY_ID_PATH, { id })
    );
  }

  /**
   * Create a new agent
   */
  async create(profile: AgentCreateRequest): Promise<CreateAgentResponse> {
    return await this.http.post<CreateAgentResponse>(`${publicApiPath}/agents`, {
      body: JSON.stringify(profile),
    });
  }

  /**
   * Update an existing agent
   */
  async update(id: string, update: AgentUpdateRequest): Promise<UpdateAgentResponse> {
    return await this.http.put<UpdateAgentResponse>(`${publicApiPath}/agents/${id}`, {
      body: JSON.stringify(update),
    });
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
