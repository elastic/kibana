/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';

// Only reads a setting, so caching per space is safe. Privileges are checked in each handler.
export const aiIndexToolsAvailability: ToolAvailabilityConfig = {
  cacheMode: 'space',
  handler: async ({ uiSettings }) => {
    const contextEngineEnabled = await uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .catch(() => false);
    if (!contextEngineEnabled) {
      return { status: 'unavailable', reason: 'Context Engine is disabled in this space.' };
    }
    return { status: 'available' };
  },
};

export const isContextEngineMemoryEnabled = async ({
  coreStart,
  request,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
}): Promise<boolean> => {
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
  return globalUiSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID).catch(() => false);
};

export const createMemoryToolsAvailability = (
  getCoreStart: () => Promise<CoreStart>
): ToolAvailabilityConfig => ({
  cacheMode: 'none',
  handler: async ({ request, uiSettings }) => {
    const contextEngineEnabled = await uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .catch(() => false);
    if (!contextEngineEnabled) {
      return { status: 'unavailable', reason: 'Context Engine is disabled in this space.' };
    }

    const coreStart = await getCoreStart();
    const memoryEnabled = await isContextEngineMemoryEnabled({ coreStart, request });
    return memoryEnabled
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'Context Engine memory is disabled.' };
  },
});
