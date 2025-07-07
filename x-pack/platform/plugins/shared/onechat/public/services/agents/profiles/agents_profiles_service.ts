/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentProfile } from '@kbn/onechat-common';
import type {
  AgentProfileCreateRequest,
  AgentProfileUpdateRequest,
  AgentProfileListOptions,
} from '../../../../common/agent_profiles';
import type {
  CreateAgentProfileResponse,
  GetAgentProfileResponse,
  ListAgentProfilesResponse,
  UpdateAgentProfileResponse,
  DeleteAgentProfileResponse,
} from '../../../../common/http_api/agent_profiles';

export class AgentProfilesService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all agent profiles
   */
  async list(options?: AgentProfileListOptions): Promise<AgentProfile[]> {
    const res = await this.http.get<ListAgentProfilesResponse>('/api/chat/agents/profiles');
    return res.agentProfiles;
  }

  /**
   * Get a single agent profile by id
   */
  async get(id: string): Promise<AgentProfile> {
    return await this.http.get<GetAgentProfileResponse>(`/api/chat/agents/profiles/${id}`);
  }

  /**
   * Create a new agent profile
   */
  async create(profile: AgentProfileCreateRequest): Promise<AgentProfile> {
    return await this.http.post<CreateAgentProfileResponse>(`/api/chat/agents/profiles`, {
      body: JSON.stringify(profile),
    });
  }

  /**
   * Update an existing agent profile
   */
  async update(id: string, update: AgentProfileUpdateRequest): Promise<AgentProfile> {
    return await this.http.put<UpdateAgentProfileResponse>(`/api/chat/agents/profiles/${id}`, {
      body: JSON.stringify(update),
    });
  }

  /**
   * Delete an agent profile by id
   */
  async delete(id: string): Promise<DeleteAgentProfileResponse> {
    return await this.http.delete<DeleteAgentProfileResponse>(`/api/chat/agents/profiles/${id}`);
  }
}
