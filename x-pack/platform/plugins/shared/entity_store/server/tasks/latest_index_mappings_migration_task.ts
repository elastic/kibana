/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core/server';
import {
  isUnrecoverableError,
  throwRetryableError,
  throwUnrecoverableError,
  type RunContext,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getErrorMessage } from '../../common';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import { findInstalledEntityStoreNamespaces } from './legacy_security_assets_migration_task';
import type { EntityStoreCoreSetup } from '../types';
import {
  migrateLatestIndexMappings,
  type MigrateLatestIndexMappingsResult,
} from '../domain/asset_manager/migrate_latest_index_mappings';

const config = TasksConfig[EntityStoreTaskType.enum.latestIndexMappingsMigration];

export const LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID = config.type;

interface NamespaceFailure {
  namespace: string;
  error: unknown;
}

const throwAborted = (): void =>
  throwRetryableError(new Error('Latest index mappings migration aborted'), true);

// Retrying cannot fix a bad request or a missing privilege (for example a 403 on `putMapping` on
// serverless, or a `total_fields` limit), so these end the task instead of burning its attempts.
const PERMANENT_STATUS_CODES: readonly number[] = [400, 401, 403];
const MAX_CAUSE_DEPTH = 5;

interface ErrorWithStatus {
  statusCode?: unknown;
  meta?: { statusCode?: unknown };
  output?: { statusCode?: unknown };
  cause?: unknown;
}

const getStatusCode = ({ statusCode, meta, output }: ErrorWithStatus): number | undefined =>
  [statusCode, meta?.statusCode, output?.statusCode].find(
    (candidate): candidate is number => typeof candidate === 'number'
  );

/**
 * True when the error carries a 400, 401 or 403 status: `statusCode` (Elasticsearch
 * `ResponseError`), `meta.statusCode` or `output.statusCode` (Boom). Wrapped errors are followed
 * through `cause` until one carries a status. Never decided from the message.
 */
const isPermanentError = (error: unknown, depth = 0): boolean => {
  if (typeof error !== 'object' || error === null || depth > MAX_CAUSE_DEPTH) {
    return false;
  }
  const statusCode = getStatusCode(error);
  if (statusCode !== undefined) {
    return PERMANENT_STATUS_CODES.includes(statusCode);
  }
  return isPermanentError((error as ErrorWithStatus).cause, depth + 1);
};

const namespacesWithResult = (
  results: Record<string, MigrateLatestIndexMappingsResult>,
  result: MigrateLatestIndexMappingsResult
): string[] =>
  Object.entries(results)
    .filter(([, namespaceResult]) => namespaceResult === result)
    .map(([namespace]) => namespace);

/**
 * Brings the latest index of every space that has the Entity Store installed up to the current
 * definition mappings, running as the Kibana internal user. Each space is independent: a failure
 * in one is recorded and the others still run, then the task fails naming the failed spaces.
 * That is retryable, unless every failure is permanent (400, 401 or 403): then it is unrecoverable
 * and Task Manager removes the one-shot task, which the next start schedules again. A failed
 * space keeps its old index `_meta` version, so the retry or the next start picks it up again.
 */
export const runLatestIndexMappingsMigration = async ({
  coreStart,
  logger,
  signal,
}: {
  coreStart: CoreStart;
  logger: Logger;
  signal: AbortSignal;
}): Promise<Record<string, MigrateLatestIndexMappingsResult>> => {
  const taskLogger = logger.get(config.type);
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  const results: Record<string, MigrateLatestIndexMappingsResult> = {};
  const failures: NamespaceFailure[] = [];

  for (const namespace of namespaces) {
    if (signal.aborted) {
      throwAborted();
    }

    try {
      results[namespace] = await migrateLatestIndexMappings({
        esClient,
        logger: taskLogger,
        namespace,
        signal,
      });
    } catch (error) {
      // An aborted request rejects with a request-aborted error: not a failure of the space.
      if (signal.aborted) {
        throwAborted();
      }
      failures.push({ namespace, error });
    }
  }

  const migrated = namespacesWithResult(results, 'migrated');
  const upToDate = namespacesWithResult(results, 'up_to_date');
  const missing = namespacesWithResult(results, 'index_missing');
  const summary = `Latest index mappings migration: migrated [${migrated.join(
    ', '
  )}], up to date [${upToDate.join(', ')}], index missing [${missing.join(', ')}]`;
  if (migrated.length > 0) {
    taskLogger.info(summary);
  } else {
    taskLogger.debug(summary);
  }

  if (failures.length > 0) {
    for (const { namespace, error } of failures) {
      taskLogger.error(
        `Latest index mappings migration failed in namespace "${namespace}": ${getErrorMessage(
          error
        )}`
      );
    }
    const failure = new Error(
      `Latest index mappings migration failed in: ${failures
        .map(({ namespace }) => namespace)
        .join(', ')}`
    );
    if (failures.every(({ error }) => isPermanentError(error))) {
      throwUnrecoverableError(failure);
    }
    throwRetryableError(failure, true);
  }

  return results;
};

export const registerLatestIndexMappingsMigrationTask = ({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: EntityStoreCoreSetup;
}): void => {
  taskManager.registerTaskDefinitions({
    [config.type]: {
      title: config.title,
      description: config.description,
      timeout: config.timeout,
      cost: config.cost,
      maxAttempts: 3,
      paramsSchema: schema.object({}),
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          try {
            await runLatestIndexMappingsMigration({ coreStart, logger, signal });
            return { state: {} };
          } catch (error) {
            const err = error instanceof Error ? error : new Error(getErrorMessage(error));
            if (signal.aborted) {
              throwRetryableError(err, true);
            }
            // Task Manager logs the thrown error; a failed space was already logged by namespace.
            // Already unrecoverable when every failed space was permanent: keep it that way.
            if (isUnrecoverableError(err) || isPermanentError(err)) {
              throwUnrecoverableError(err);
            }
            throwRetryableError(err, true);
          }
        },
      }),
    },
  });
};

/**
 * Schedules the one-shot migration when any space has the Entity Store installed. Idempotent via
 * `ensureScheduled` and a stable task id; never throws so it cannot break plugin start.
 */
export const scheduleLatestIndexMappingsMigration = async ({
  coreStart,
  taskManager,
  logger,
}: {
  coreStart: CoreStart;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): Promise<void> => {
  const taskLogger = logger.get(config.type);

  let namespaces: string[];
  try {
    namespaces = await findInstalledEntityStoreNamespaces(coreStart);
  } catch (error) {
    taskLogger.warn(
      `Could not list Entity Store namespaces for latest index mappings migration scheduling: ${getErrorMessage(
        error
      )}`
    );
    return;
  }

  if (namespaces.length === 0) {
    taskLogger.debug(
      'No installed Entity Store namespaces; skipping latest index mappings migration schedule'
    );
    return;
  }

  const now = new Date();
  try {
    await taskManager.ensureScheduled({
      id: LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID,
      taskType: config.type,
      scheduledAt: now,
      runAt: now,
      params: {},
      state: {},
    });
    taskLogger.info(`Scheduled task "${LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID}"`);
  } catch (error) {
    taskLogger.error(
      `Error scheduling ${LATEST_INDEX_MAPPINGS_MIGRATION_TASK_ID}: ${getErrorMessage(error)}`
    );
  }
};
