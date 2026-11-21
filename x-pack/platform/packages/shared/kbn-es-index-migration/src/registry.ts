/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { registerMigrationTask, scheduleMigrationTask } from './task';
import type {
  MigrationDefinition,
  MigrationRegistry,
  MigrationRegistryOptions,
  MigrationRunnerDeps,
  MigrationStartOptions,
} from './types';

/**
 * Holds the migrations a plugin has declared.
 *
 * Registration exists so that `id` means something beyond a log label: it is the key
 * that status, metrics and logs are all reported under, so two definitions sharing one
 * would silently merge in every one of them. Rejecting a duplicate at registration
 * turns that into a startup failure instead.
 *
 * Scoped to the plugin that creates it. The consumer supplies its own Task Manager for
 * `auto` migrations, which is what lets a package own a background task without
 * becoming a plugin.
 */
export const createMigrationRegistry = ({
  pluginId,
  taskManager,
  timeout,
}: MigrationRegistryOptions): MigrationRegistry => {
  const definitions = new Map<string, MigrationDefinition>();
  let deps: MigrationRunnerDeps | undefined;
  let started = false;

  if (taskManager) {
    // Must happen during setup, which is the only lifecycle Task Manager accepts a
    // definition in. Registering here rather than per-migration means definitions can
    // still be added afterwards - the runner reads this map when it fires.
    registerMigrationTask({
      pluginId,
      taskManager,
      timeout,
      getDefinitions: () => [...definitions.values()],
      getDeps: () => deps,
    });
  }

  return {
    register(definition: MigrationDefinition): void {
      if (started) {
        throw new Error(
          `es-index-migration [${definition.id}]: register() was called after start(). ` +
            `Task Manager only accepts task definitions during setup, and the task may ` +
            `already have run.`
        );
      }

      if (definition.execution === 'auto' && taskManager === undefined) {
        // Without this the migration would never run and nothing would say so.
        throw new Error(
          `es-index-migration [${definition.id}]: execution is "auto" but the registry was ` +
            `created without a taskManager. Pass one to createMigrationRegistry, or use ` +
            `"manual" and call reconcile() yourself.`
        );
      }

      const existing = definitions.get(definition.id);

      if (existing !== undefined) {
        // Re-registering the identical object is a double import, not a collision.
        if (existing === definition) {
          return;
        }
        throw new Error(
          `es-index-migration: a different migration is already registered as "${definition.id}". ` +
            `Ids must be unique - they key status, metrics and logs.`
        );
      }

      definitions.set(definition.id, definition);
    },

    async start({ taskManager: taskManagerStart, interval, ...runnerDeps }: MigrationStartOptions) {
      deps = runnerDeps;
      started = true;

      if (taskManager === undefined) {
        // Nothing registered a task, so there is nothing to schedule. `lifecycle` and
        // `triggered` migrations still work - their caller drives them.
        return;
      }

      await scheduleMigrationTask(pluginId, taskManagerStart, interval);
    },

    get(id: string): MigrationDefinition | undefined {
      return definitions.get(id);
    },

    has(id: string): boolean {
      return definitions.has(id);
    },

    all(): MigrationDefinition[] {
      return [...definitions.values()];
    },

    get size(): number {
      return definitions.size;
    },
  };
};

export type { TaskManagerSetupContract, TaskManagerStartContract };
