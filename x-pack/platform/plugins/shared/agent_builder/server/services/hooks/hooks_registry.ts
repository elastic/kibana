/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType } from '@kbn/agent-builder-common';
import type { HookRegistration, HooksServiceSetup } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';

type HookRegistrationsBundle = Parameters<HooksServiceSetup['register']>[0];

export function buildHookRegistrationId(bundleId: string, lifecycle: HookLifecycle): string {
  return `${bundleId}-${lifecycle}`;
}

/**
 * Rejects `afterChatEvent` entries that subscribe to no event type, or to message chunks.
 */
const validateAfterChatEventEntry = (lifeCycleId: string, eventTypes: unknown): void => {
  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    throw new Error(`Hook with id "${lifeCycleId}" must declare at least one event type.`);
  }

  if (eventTypes.includes(ChatEventType.messageChunk)) {
    throw new Error(
      `Hook with id "${lifeCycleId}" cannot run on "${ChatEventType.messageChunk}" events.`
    );
  }
};

export interface HookRegistry {
  register(bundle: HookRegistrationsBundle): void;
  getHooksForLifecycle(lifecycle: HookLifecycle): Array<HookRegistration<HookLifecycle>>;
}

export function createHookRegistry(): HookRegistry {
  const registrationsByEvent = new Map<HookLifecycle, Array<HookRegistration<HookLifecycle>>>();

  for (const lifecycle of Object.values(HookLifecycle)) {
    registrationsByEvent.set(lifecycle, []);
  }

  return {
    register(bundle: HookRegistrationsBundle) {
      for (const [lifeCycle, entry] of Object.entries(bundle.hooks)) {
        const lifecycleKey = lifeCycle as HookLifecycle;
        const lifeCycleId = buildHookRegistrationId(bundle.id, lifecycleKey);
        const hooksLifecycleEntries = registrationsByEvent.get(lifecycleKey);

        if (!hooksLifecycleEntries) {
          throw new Error(`Hook lifecycle "${lifeCycle}" was not initialized`);
        }
        if (hooksLifecycleEntries.some((r) => r.id === lifeCycleId)) {
          throw new Error(
            `Hook with id "${lifeCycleId}" is already registered for event "${lifeCycle}".`
          );
        }
        if (lifecycleKey === HookLifecycle.afterChatEvent) {
          validateAfterChatEventEntry(lifeCycleId, (entry as { eventTypes?: unknown }).eventTypes);
        }

        hooksLifecycleEntries.push({
          ...entry,
          id: lifeCycleId,
          priority: bundle.priority,
        } as HookRegistration<HookLifecycle>);
      }
    },

    getHooksForLifecycle(lifecycle: HookLifecycle) {
      return registrationsByEvent.get(lifecycle) ?? [];
    },
  };
}
