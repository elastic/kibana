/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HookRegistration, HooksServiceSetup } from '@kbn/agent-builder-server';
import { HookLifecycle } from '@kbn/agent-builder-server';

type HookRegistrationsBundle = Parameters<HooksServiceSetup['register']>[0];

export function buildHookRegistrationId(bundleId: string, lifecycle: HookLifecycle): string {
  return `${bundleId}-${lifecycle}`;
}

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
