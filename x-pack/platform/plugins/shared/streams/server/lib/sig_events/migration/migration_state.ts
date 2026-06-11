/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { TaskStatus } from '@kbn/streams-schema';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { PersistedTask } from '../../tasks/types';
import { taskStorageSettings } from '../../tasks/storage';
import { SIGEVENTS_V2_MIGRATION_TASK_ID, SIGEVENTS_V2_MIGRATION_TASK_TYPE } from './constants';

export type SigEventsV2MigrationStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export interface SigEventsV2MigrationFailure {
  stream_name: string;
  query_id: string;
  rule_id: string;
  error: string;
}

export interface SigEventsV2MigrationPayload {
  migrated_count: number;
  failed_queries: SigEventsV2MigrationFailure[];
  completed_at?: string;
  last_run_at: string;
}

interface MigrationTaskParams {
  readonly _: true;
}

export interface SigEventsV2MigrationState {
  status: SigEventsV2MigrationStatus;
  migrated_count: number;
  failed_queries: SigEventsV2MigrationFailure[];
  completed_at?: string;
  last_run_at?: string;
}

const EMPTY_PARAMS: MigrationTaskParams = { _: true };

function toMigrationState(
  task: PersistedTask<MigrationTaskParams, SigEventsV2MigrationPayload> | undefined
): SigEventsV2MigrationState {
  if (!task || task.status === TaskStatus.NotStarted) {
    return { status: 'not_started', migrated_count: 0, failed_queries: [] };
  }

  const payload =
    'payload' in task.task
      ? (task.task.payload as SigEventsV2MigrationPayload | undefined)
      : undefined;

  if (task.status === TaskStatus.InProgress) {
    return {
      status: 'in_progress',
      migrated_count: payload?.migrated_count ?? 0,
      failed_queries: payload?.failed_queries ?? [],
      last_run_at: payload?.last_run_at,
    };
  }

  if (task.status === TaskStatus.Failed) {
    return {
      status: 'failed',
      migrated_count: payload?.migrated_count ?? 0,
      failed_queries: payload?.failed_queries ?? [],
      last_run_at: payload?.last_run_at,
      completed_at: payload?.completed_at,
    };
  }

  return {
    status: 'completed',
    migrated_count: payload?.migrated_count ?? 0,
    failed_queries: payload?.failed_queries ?? [],
    last_run_at: payload?.last_run_at,
    completed_at: payload?.completed_at ?? task.last_completed_at,
  };
}

export class SigEventsV2MigrationStateStore {
  private readonly storageClient;

  constructor(esClient: ElasticsearchClient, logger: Logger) {
    const adapter = new StorageIndexAdapter<typeof taskStorageSettings, PersistedTask>(
      esClient,
      logger,
      taskStorageSettings
    );
    this.storageClient = adapter.getClient();
  }

  async getState(): Promise<SigEventsV2MigrationState> {
    try {
      const doc = await this.storageClient.get({ id: SIGEVENTS_V2_MIGRATION_TASK_ID });
      return toMigrationState(
        doc._source as PersistedTask<MigrationTaskParams, SigEventsV2MigrationPayload>
      );
    } catch {
      return { status: 'not_started', migrated_count: 0, failed_queries: [] };
    }
  }

  async markInProgress(): Promise<void> {
    await this.persist({
      status: TaskStatus.InProgress,
      payload: {
        migrated_count: 0,
        failed_queries: [],
        last_run_at: new Date().toISOString(),
      },
    });
  }

  async markCompleted(payload: SigEventsV2MigrationPayload): Promise<void> {
    await this.persist({
      status: TaskStatus.Completed,
      payload,
      last_completed_at: payload.completed_at ?? new Date().toISOString(),
    });
  }

  async markFailed(payload: SigEventsV2MigrationPayload): Promise<void> {
    await this.persist({
      status: TaskStatus.Failed,
      payload,
      last_failed_at: new Date().toISOString(),
    });
  }

  private async persist({
    status,
    payload,
    last_completed_at,
    last_failed_at,
  }: {
    status: PersistedTask['status'];
    payload: SigEventsV2MigrationPayload;
    last_completed_at?: string;
    last_failed_at?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.storageClient.index({
      id: SIGEVENTS_V2_MIGRATION_TASK_ID,
      document: {
        id: SIGEVENTS_V2_MIGRATION_TASK_ID,
        type: SIGEVENTS_V2_MIGRATION_TASK_TYPE,
        status,
        space: '*',
        created_at: now,
        last_completed_at,
        last_failed_at,
        task: {
          params: EMPTY_PARAMS,
          payload,
        },
      },
      refresh: true,
    });
  }
}
