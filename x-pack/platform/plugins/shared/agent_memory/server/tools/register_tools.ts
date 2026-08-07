/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server/tools/builtin';
import { i18n } from '@kbn/i18n';
import { createMemoryTools } from '.';
import type { MemoryToolsOptions } from './types';

/**
 * How long a resolved availability answer is reused, in seconds. Shorter than the
 * 300s default so switching memory on is reflected within a minute.
 */
const AVAILABILITY_CACHE_TTL = 60;

/**
 * Availability gate for the memory tools.
 *
 * MUST stay free of I/O. `ToolRegistry` races this handler against a hard 2s
 * timeout and treats a timeout as *unavailable*, logging only a warning — so a
 * slow handler makes all seven tools vanish from the tool picker and from MCP in
 * a way that looks exactly like a misconfiguration.
 */
export const createMemoryToolAvailability = ({
  isMemoryEnabled,
  isStorageInstalled,
}: {
  isMemoryEnabled: () => boolean;
  isStorageInstalled: () => boolean;
}): ToolAvailabilityConfig => ({
  // Per-space rather than global: memory's *storage* is global, but license and
  // feature resolution are not, and a 'global' cache would leak one space's
  // answer into another if that ever changes.
  cacheMode: 'space',
  cacheTtl: AVAILABILITY_CACHE_TTL,
  handler: async () => {
    if (!isMemoryEnabled()) {
      return {
        status: 'unavailable',
        reason: i18n.translate('xpack.agentMemory.tools.unavailable.disabled', {
          defaultMessage: 'Agent memory is not enabled in this deployment',
        }),
      };
    }
    if (!isStorageInstalled()) {
      return {
        status: 'unavailable',
        reason: i18n.translate('xpack.agentMemory.tools.unavailable.notInstalled', {
          defaultMessage: 'Agent memory storage has not been created yet',
        }),
      };
    }
    return { status: 'available' };
  },
});

/**
 * Registers the memory tools as real built-in tools, which is what makes them
 * selectable on an agent and visible over MCP. Registration is unconditional so
 * the tool catalogue stays stable; the availability gate hides them when memory
 * is off or not yet installed.
 */
export const registerMemoryTools = ({
  agentBuilder,
  availability,
  toolOptions,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  availability: ToolAvailabilityConfig;
  toolOptions: MemoryToolsOptions;
}): void => {
  for (const tool of createMemoryTools(toolOptions)) {
    agentBuilder.tools.register({ ...tool, availability });
  }
};
