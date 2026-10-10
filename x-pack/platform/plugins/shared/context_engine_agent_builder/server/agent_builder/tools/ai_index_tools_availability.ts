/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';

// Only reads settings, so caching per space is safe. Privileges are checked in each handler.
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
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
    const memoryEnabled = await globalUiSettings
      .get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)
      .catch(() => false);
    return memoryEnabled
      ? { status: 'available' }
      : { status: 'unavailable', reason: 'Context Engine memory is disabled.' };
  },
});

/**
 * save_automation is the tool that persists agent-authored workflow YAML — the only action
 * that the feedback loop setting gates. Checking it server-side here means the tool is
 * unavailable regardless of what the LLM instructions or the client-provided attachment say.
 *
 * contextEngine:feedbackLoopEnabled is a global setting, so it must be read through the
 * global settings client (same pattern as createMemoryToolsAvailability).
 */
export const createSaveAutomationToolAvailability = (
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
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
    const feedbackLoopEnabled = await globalUiSettings
      .get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID)
      .catch(() => false);
    if (!feedbackLoopEnabled) {
      return {
        status: 'unavailable',
        reason:
          'Saving agent-authored workflow automations requires the contextEngine:feedbackLoopEnabled advanced setting to be on.',
      };
    }
    return { status: 'available' };
  },
});
