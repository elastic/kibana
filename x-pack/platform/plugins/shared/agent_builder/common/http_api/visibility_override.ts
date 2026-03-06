/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response shape for GET /internal/agent_builder/_visibility_override.
 * Returns only the visibility access override flag (server-side ES privilege check; not in Kibana capabilities).
 */
export interface VisibilityOverrideResponse {
  /** When true, user can read/write/change visibility on any agent regardless of ownership. */
  hasAgentVisibilityAccessOverride: boolean;
}
