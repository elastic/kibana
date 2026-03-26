/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { MemoryService } from '../../../lib/memory';

export interface MemoryHookSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface MemoryHookServices {
  memory: MemoryService;
}

export interface RegisterMemoryHooksDeps {
  logger: Logger;
  getMemoryServices: () => MemoryHookServices;
  isMemoryEnabled: () => Promise<boolean>;
  /**
   * Optional callback to schedule a memory update task in the background.
   * Used by hooks that need to trigger follow-up work (e.g., question generation)
   * after synthesizing memory.
   */
  scheduleMemoryTask?: (
    triggerId: string,
    payload: Record<string, unknown>,
    request: KibanaRequest
  ) => Promise<void>;
}
