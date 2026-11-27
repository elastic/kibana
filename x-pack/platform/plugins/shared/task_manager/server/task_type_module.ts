/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsServiceStart, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { CancellableTask, RunContext } from './task';
import type { TaskRegisterDefinition } from './task_type_dictionary';

/**
 * What a task type module may use. In Kibana this is Core; in a task process it is built from
 * Core's building blocks. A module never knows which, so it runs the same in both.
 */
export interface TaskHost {
  logger: Logger;
  elasticsearch: Pick<IClusterClient, 'asInternalUser' | 'asScoped'>;
  savedObjects: Pick<SavedObjectsServiceStart, 'createInternalRepository'>;
}

/**
 * A task type as one importable file: the definition Task Manager registers, minus the runner
 * factory, plus the factory that receives the host.
 */
export interface TaskTypeModule extends Omit<TaskRegisterDefinition, 'createTaskRunner'> {
  /** The Task Manager task type, such as `task_manager:delete_inactive_background_task_nodes`. */
  type: string;
  /**
   * Saved object types the runner reads or writes. A task process registers them; Kibana already
   * has them.
   */
  savedObjectTypes?: SavedObjectsType[];
  createTaskRunner: (context: RunContext, host: TaskHost) => CancellableTask;
}

export const defineTaskType = (module: TaskTypeModule): TaskTypeModule => module;

/**
 * Adapts a module to what `registerTaskDefinitions` takes. The host is resolved when the first
 * run is created, which is after Core has started.
 */
export const toTaskDefinition = (
  module: TaskTypeModule,
  getHost: () => Promise<TaskHost>
): TaskRegisterDefinition => {
  const { type, savedObjectTypes, createTaskRunner, ...definition } = module;
  return {
    ...definition,
    createTaskRunner: (context: RunContext): CancellableTask => {
      let created: CancellableTask | undefined;
      let cancelled = false;
      return {
        run: async () => {
          created = createTaskRunner(context, await getHost());
          // Cancelled while the host was resolving: the run never starts.
          if (cancelled) await created.cancel?.();
          return created.run();
        },
        cancel: async () => {
          cancelled = true;
          return created?.cancel?.();
        },
        cleanup: async () => created?.cleanup?.(),
      };
    },
  };
};
