/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ensureLatestIndexProvenanceMapping } from '../domain/asset_manager/ensure_latest_index_mappings';
import {
  ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID,
  runEntityProvenanceMappingMigration,
  scheduleEntityProvenanceMappingMigrationIfNeeded,
} from './entity_provenance_mapping_migration_task';

jest.mock('../domain/asset_manager/ensure_latest_index_mappings');

const mockEnsureLatestIndexProvenanceMapping =
  ensureLatestIndexProvenanceMapping as jest.MockedFunction<
    typeof ensureLatestIndexProvenanceMapping
  >;

describe('entity_provenance_mapping_migration_task', () => {
  const logger = loggerMock.create();
  let mockEsClient: ElasticsearchClient;
  let mockFind: jest.Mock;
  let coreStart: CoreStart;
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'ensureScheduled'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = {} as ElasticsearchClient;
    mockFind = jest.fn();
    mockEnsureLatestIndexProvenanceMapping.mockResolvedValue(true);

    coreStart = {
      elasticsearch: {
        client: {
          asInternalUser: mockEsClient,
        },
      },
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({ find: mockFind }),
      },
    } as unknown as CoreStart;

    taskManager = {
      ensureScheduled: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('migrates every installed namespace and reports a missing latest index as skipped', async () => {
    mockFind.mockResolvedValue({
      saved_objects: [{ namespaces: ['default'] }, { namespaces: ['other'] }],
    });
    mockEnsureLatestIndexProvenanceMapping.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      runEntityProvenanceMappingMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
        isMigrationEnabled: async () => true,
      })
    ).resolves.toEqual({ migrated: ['default'], skipped: ['other'] });

    expect(mockEnsureLatestIndexProvenanceMapping).toHaveBeenCalledTimes(2);
  });

  it('does no work when the feature flag is off', async () => {
    mockFind.mockResolvedValue({ saved_objects: [{ namespaces: ['default'] }] });

    await expect(
      runEntityProvenanceMappingMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
        isMigrationEnabled: async () => false,
      })
    ).resolves.toEqual({ migrated: [], skipped: [] });

    expect(mockEnsureLatestIndexProvenanceMapping).not.toHaveBeenCalled();
  });

  it('stops before mapping work when aborted', async () => {
    mockFind.mockResolvedValue({ saved_objects: [{ namespaces: ['default'] }] });
    const controller = new AbortController();
    controller.abort();

    await expect(
      runEntityProvenanceMappingMigration({
        coreStart,
        logger,
        signal: controller.signal,
        isMigrationEnabled: async () => true,
      })
    ).rejects.toThrow(/aborted/i);

    expect(mockEnsureLatestIndexProvenanceMapping).not.toHaveBeenCalled();
  });

  it('schedules one stable task when installed namespaces exist and the flag is on', async () => {
    mockFind.mockResolvedValue({ saved_objects: [{ namespaces: ['default'] }] });

    await scheduleEntityProvenanceMappingMigrationIfNeeded({
      coreStart,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      logger,
      isMigrationEnabled: async () => true,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID,
        taskType: ENTITY_PROVENANCE_MAPPING_MIGRATION_TASK_ID,
        params: {},
        state: {},
      })
    );
  });

  it('does not schedule when the flag is off or no namespaces exist', async () => {
    mockFind.mockResolvedValue({ saved_objects: [] });

    await scheduleEntityProvenanceMappingMigrationIfNeeded({
      coreStart,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      logger,
      isMigrationEnabled: async () => false,
    });
    await scheduleEntityProvenanceMappingMigrationIfNeeded({
      coreStart,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      logger,
      isMigrationEnabled: async () => true,
    });

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });
});
