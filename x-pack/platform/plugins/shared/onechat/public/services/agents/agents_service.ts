/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentDefinition } from '@kbn/onechat-common';
import type {
  AgentCreateRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../common/agents';
import type {
  CreateAgentResponse,
  DeleteAgentResponse,
  GetAgentResponse,
  ListAgentResponse,
  UpdateAgentResponse,
} from '../../../common/http_api/agents';

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all agents
   */
  async list(options?: AgentListOptions): Promise<AgentDefinition[]> {
    const res = await this.http.get<ListAgentResponse>('/api/chat/agents');
    return res.results;
  }

  /**
   * Get a single agent by id
   */
  async get(id: string): Promise<AgentDefinition> {
    return await this.http.get<GetAgentResponse>(`/api/chat/agents/${id}`);
  }

  /**
   * Create a new agent
   */
  async create(profile: AgentCreateRequest): Promise<AgentDefinition> {
    return await this.http.post<CreateAgentResponse>(`/api/chat/agents`, {
      body: JSON.stringify(profile),
    });
  }

  /**
   * Update an existing agent
   */
  async update(id: string, update: AgentUpdateRequest): Promise<AgentDefinition> {
    return await this.http.put<UpdateAgentResponse>(`/api/chat/agents/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete an agent by id
   */
  async delete(id: string): Promise<DeleteAgentResponse> {
    return await this.http.delete<DeleteAgentResponse>(`/api/chat/agents/${id}`);
  }
}
