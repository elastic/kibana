/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response body shared by GET and PUT of the per-space Agent Builder settings.
 *
 * `default_agent_id` is `null` when no agent is assigned to the current space.
 */
export interface SpaceSettingsResponse {
  default_agent_id: string | null;
}

export type UpdateSpaceSettingsRequestBody = SpaceSettingsResponse;
