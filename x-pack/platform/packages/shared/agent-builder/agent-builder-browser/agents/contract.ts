/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';

/**
 * Public-faving contract for AgentBuilder's agents service.
 */
export interface AgentsServiceStartContract {
  /**
   * List all agents available.
   */
  list(): Promise<AgentDefinition[]>;
}
