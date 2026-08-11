/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  SpaceSettingsResponse,
  UpdateSpaceSettingsRequestBody,
} from '../../../common/http_api/space_settings';
import { internalApiPath } from '../../../common/constants';

/**
 * Client wrapper for the per-space Agent Builder settings internal API.
 *
 * Kept separate from `AgentService` so the split matches the server-side
 * organization (settings live in their own routes file and use a distinct
 * privilege for writes).
 */
export class SpaceSettingsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /** Returns the currently assigned default agent id for the active space. */
  async get(): Promise<SpaceSettingsResponse> {
    return await this.http.get<SpaceSettingsResponse>(`${internalApiPath}/space_settings`);
  }

  /**
   * Assigns a default agent for the active space, or clears the assignment
   * when `defaultAgentId` is `null`.
   */
  async set(defaultAgentId: string | null): Promise<SpaceSettingsResponse> {
    const body: UpdateSpaceSettingsRequestBody = { default_agent_id: defaultAgentId };
    return await this.http.put<SpaceSettingsResponse>(`${internalApiPath}/space_settings`, {
      body: JSON.stringify(body),
    });
  }
}
