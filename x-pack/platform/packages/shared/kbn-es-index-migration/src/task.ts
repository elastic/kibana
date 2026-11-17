/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  TaskCost,
  TaskPriority,
  throwRetryableError,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
  type TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import { reconcile } from './reconcile';
import type { LastRun, MigrationDefinition, MigrationRunnerDeps } from './types';

export const TASK_TYPE_PREFIX = 'es-index-migration';

/** One task type and one task instance per consuming plugin, both named from its id. */
export const taskTypeFor = (pluginId: string): string => `${TASK_TYPE_PREFIX}:${pluginId}`;
export const taskIdFor = (pluginId: string): string => taskTypeFor(pluginId);

/**
 * Migrations land on upgrade, so this is a safety net rather than the delivery
 * mechanism - frequent enough that a missed or failed run self-corrects within the hour,
 * rare enough that a no-op sweep costs nothing.
 */
export const DEFAULT_INTERVAL = '60m';

/**
 * A step is usually a single putMapping, but a declared data step can be a backfill, and
 * one run covers every namespace.
 *
 * A consumer whose migrations are heavier should raise this rather than let Task Manager
 * kill work mid-run; one whose migrations are trivial should lower it, so a wedged run
 * releases its slot sooner.
 */
export const DEFAULT_TIMEOUT = '10m';

const lastRunSchema = schema.object({
  version: schema.number(),
  status: schema.string(),
  namespace: schema.string(),
  at: schema.string(),
  error: schema.maybe(schema.string()),
});

const stateSchemaV1 = schema.object({
  lastRunByMigrationId: schema.recordOf(schema.string(), lastRunSchema, { defaultValue: {} }),
});

export interface MigrationTaskState {
  lastRunByMigrationId: Record<string, LastRun>;
}

interface RegisterArgs {
  pluginId: string;
  taskManager: TaskManagerSetupContract;
  /** Read when the task fires, so migrations registered after setup are still picked up. */
  getDefinitions: () => MigrationDefinition[];
  getDeps: () => MigrationRunnerDeps | undefined;
  /** Defaults to {@link DEFAULT_TIMEOUT}. */
  timeout?: string;
}

/**
 * Registers the plugin's migration task.
 *
 * One task type per plugin rather than per migration, so `registerTaskDefinitions` is
 * called exactly once during setup while definitions can still be added afterwards - the
 * runner reads the registry when it fires. Task Manager's claim then gives
 * once-per-cluster execution without the library building a lock of its own.
 */
export const registerMigrationTask = ({
  pluginId,
  taskManager,
  getDefinitions,
  getDeps,
  timeout = DEFAULT_TIMEOUT,
}: RegisterArgs): void => {
  taskManager.registerTaskDefinitions({
    [taskTypeFor(pluginId)]: {
      title: `Elasticsearch index migrations (${pluginId})`,
      description:
        `Brings ${pluginId}'s Elasticsearch indices up to the version its code expects. ` +
        `Idempotent: does nothing when every index already matches.`,
      timeout,
      // `maxAttempts` is deliberately left at the framework default: reconcile is
      // idempotent, so retrying a transient Elasticsearch failure is safe and better than
      // waiting for the next sweep.
      // A handful of requests per namespace, holding no large result set.
      cost: TaskCost.Normal,
      // Not user-interactive, but a migration gates the code that depends on it, so it
      // should not be deferred under load either.
      priority: TaskPriority.Standard,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
      },
      createTaskRunner: createRunner({ getDefinitions, getDeps }),
    },
  });
};

const createRunner =
  ({
    getDefinitions,
    getDeps,
  }: Pick<RegisterArgs, 'getDefinitions' | 'getDeps'>): TaskRunCreatorFunction =>
  ({ taskInstance, signal }) => ({
    run: async () => {
      const deps = getDeps();
      const previous = (taskInstance.state as MigrationTaskState)?.lastRunByMigrationId ?? {};

      if (!deps) {
        // start() has not run yet. Transient by nature, so let the task come back rather
        // than burning an attempt on a race with plugin startup.
        throwRetryableError(
          new Error('es-index-migration: runner dependencies not available'),
          true
        );
      }

      const { getEsClient, getNamespaces, logger } = deps!;
      const esClient = await getEsClient();
      const namespaces = await getNamespaces();
      const lastRunByMigrationId: Record<string, LastRun> = { ...previous };

      for (const definition of getDefinitions()) {
        if (definition.execution !== 'auto') {
          continue;
        }

        for (const namespace of namespaces) {
          if (signal.aborted) {
            // Stop cleanly and keep what has been recorded; the next run resumes.
            return { state: { lastRunByMigrationId } };
          }

          const result = await reconcile({ definition, esClient, logger, namespace, signal });

          // Only `auto` has no caller to receive the result, so it is the only mode whose
          // outcome has to survive the run to stay answerable.
          lastRunByMigrationId[definition.id] = {
            version: result.installed,
            status: result.status,
            namespace,
            at: new Date().toISOString(),
            error: result.error,
          };
        }
      }

      return { state: { lastRunByMigrationId } };
    },
  });

/**
 * Schedules the plugin's task.
 *
 * `ensureScheduled` rather than `schedule`, so a Kibana restart does not accumulate a
 * duplicate task on every boot.
 */
export const scheduleMigrationTask = async (
  pluginId: string,
  taskManager: TaskManagerStartContract,
  interval: string = DEFAULT_INTERVAL
): Promise<void> => {
  await taskManager.ensureScheduled({
    id: taskIdFor(pluginId),
    taskType: taskTypeFor(pluginId),
    schedule: { interval },
    params: {},
    state: { lastRunByMigrationId: {} },
  });
};
