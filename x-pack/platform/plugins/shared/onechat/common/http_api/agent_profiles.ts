/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentProfile } from '@kbn/onechat-common';

export type GetAgentProfileResponse = AgentProfile;

export interface ListAgentProfilesResponse {
  agentProfiles: AgentProfile[];
}

export type UpdateAgentProfileResponse = AgentProfile;

export type CreateAgentProfileResponse = AgentProfile;

export interface DeleteAgentProfileResponse {
  success: boolean;
}
