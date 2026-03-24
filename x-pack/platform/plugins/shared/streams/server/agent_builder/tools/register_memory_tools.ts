/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import type { MemoryService } from '../../lib/memory';
import { createMemoryTools } from './memory';

export const registerMemoryTools = ({
  agentBuilder,
  getMemoryService,
  getSecurity,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getMemoryService: () => MemoryService;
  getSecurity: () => SecurityServiceStart;
  logger: Logger;
}): void => {
  const memoryTools = createMemoryTools({
    getMemoryService,
    getSecurity,
  });

  for (const tool of memoryTools) {
    agentBuilder.tools.register(tool);
  }

  logger.debug(`Registered ${memoryTools.length} memory tools`);
};
