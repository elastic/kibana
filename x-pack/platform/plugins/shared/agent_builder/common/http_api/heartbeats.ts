/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentHeartbeat } from '../heartbeats';

export type GetHeartbeatResponse = AgentHeartbeat;

export interface ListHeartbeatsResponse {
  results: AgentHeartbeat[];
}

export type CreateHeartbeatResponse = AgentHeartbeat;
export type UpdateHeartbeatResponse = AgentHeartbeat;
export type PauseHeartbeatResponse = AgentHeartbeat;
export type ResumeHeartbeatResponse = AgentHeartbeat;

export interface DeleteHeartbeatResponse {
  success: boolean;
}
