/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentHeartbeat, HeartbeatCreateRequest, HeartbeatUpdateRequest } from '../../../common/heartbeats';
import type {
  ListHeartbeatsResponse,
  GetHeartbeatResponse,
  CreateHeartbeatResponse,
  UpdateHeartbeatResponse,
  DeleteHeartbeatResponse,
  PauseHeartbeatResponse,
  ResumeHeartbeatResponse,
} from '../../../common/http_api/heartbeats';
import { publicApiPath } from '../../../common/constants';

export class HeartbeatsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * List all heartbeats for an agent.
   */
  async list(agentId: string): Promise<AgentHeartbeat[]> {
    const res = await this.http.get<ListHeartbeatsResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats`,
      { version: '1' }
    );
    return res.results;
  }

  /**
   * Get a single heartbeat by ID.
   */
  async get(agentId: string, heartbeatId: string): Promise<AgentHeartbeat> {
    return this.http.get<GetHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats/${heartbeatId}`,
      { version: '1' }
    );
  }

  /**
   * Create a new heartbeat.
   */
  async create(agentId: string, body: HeartbeatCreateRequest): Promise<AgentHeartbeat> {
    return this.http.post<CreateHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats`,
      { body: JSON.stringify(body), version: '1' }
    );
  }

  /**
   * Update an existing heartbeat.
   */
  async update(agentId: string, heartbeatId: string, body: HeartbeatUpdateRequest): Promise<AgentHeartbeat> {
    return this.http.put<UpdateHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats/${heartbeatId}`,
      { body: JSON.stringify(body), version: '1' }
    );
  }

  /**
   * Delete a heartbeat.
   */
  async delete(agentId: string, heartbeatId: string): Promise<DeleteHeartbeatResponse> {
    return this.http.delete<DeleteHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats/${heartbeatId}`,
      { version: '1' }
    );
  }

  /**
   * Pause a heartbeat (stops scheduled execution, preserves it).
   */
  async pause(agentId: string, heartbeatId: string): Promise<AgentHeartbeat> {
    return this.http.post<PauseHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats/${heartbeatId}/pause`,
      { version: '1' }
    );
  }

  /**
   * Resume a paused heartbeat (fires immediately, then on schedule).
   */
  async resume(agentId: string, heartbeatId: string): Promise<AgentHeartbeat> {
    return this.http.post<ResumeHeartbeatResponse>(
      `${publicApiPath}/agents/${agentId}/heartbeats/${heartbeatId}/resume`,
      { version: '1' }
    );
  }
}
