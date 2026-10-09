/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CycleHookDefinition,
  HookRegistration,
  HooksServiceSetup,
} from '@kbn/agent-builder-server';
import { HookLifecycle, MAX_CYCLE_HOOK_TIMEOUT_MS } from '@kbn/agent-builder-server';

type HookRegistrationsBundle = Parameters<HooksServiceSetup['register']>[0];

export function buildHookRegistrationId(bundleId: string, lifecycle: HookLifecycle): string {
  return `${bundleId}-${lifecycle}`;
}

export interface HookRegistry {
  register(bundle: HookRegistrationsBundle): void;
  registerCycleHook(definition: CycleHookDefinition): void;
  getHooksForLifecycle(lifecycle: HookLifecycle): Array<HookRegistration<HookLifecycle>>;
  getCycleHooks(): CycleHookDefinition[];
}

const validateCycleHookDefinition = ({
  id,
  when,
  boundAgents,
  timeout,
}: CycleHookDefinition): void => {
  if (!id) {
    throw new Error('Cycle hook id must not be empty.');
  }
  if (boundAgents !== undefined) {
    if (boundAgents.length === 0) {
      throw new Error(`Cycle hook "${id}": boundAgents must list at least one agent id.`);
    }
    if (boundAgents.some((agentId) => typeof agentId !== 'string' || agentId.length === 0)) {
      throw new Error(`Cycle hook "${id}": boundAgents must contain non-empty agent ids.`);
    }
  }
  if (typeof when === 'string') {
    if (when !== 'first' && when !== 'every_cycle') {
      throw new Error(`Cycle hook "${id}": unknown trigger "${when}".`);
    }
  } else if (when !== undefined) {
    if (!Number.isInteger(when.everyCycles) || when.everyCycles < 1) {
      throw new Error(
        `Cycle hook "${id}": everyCycles must be a positive integer, got ${when.everyCycles}.`
      );
    }
  }
  if (timeout !== undefined && !(timeout > 0 && timeout <= MAX_CYCLE_HOOK_TIMEOUT_MS)) {
    throw new Error(
      `Cycle hook "${id}": timeout must be between 1 and ${MAX_CYCLE_HOOK_TIMEOUT_MS} ms, got ${timeout}.`
    );
  }
};

export function createHookRegistry(): HookRegistry {
  const registrationsByEvent = new Map<HookLifecycle, Array<HookRegistration<HookLifecycle>>>();
  const cycleHooks: CycleHookDefinition[] = [];

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

    registerCycleHook(definition: CycleHookDefinition) {
      validateCycleHookDefinition(definition);
      if (cycleHooks.some((hook) => hook.id === definition.id)) {
        throw new Error(`Cycle hook with id "${definition.id}" is already registered.`);
      }
      cycleHooks.push(definition);
    },

    getHooksForLifecycle(lifecycle: HookLifecycle) {
      return registrationsByEvent.get(lifecycle) ?? [];
    },

    getCycleHooks() {
      return [...cycleHooks];
    },
  };
}
