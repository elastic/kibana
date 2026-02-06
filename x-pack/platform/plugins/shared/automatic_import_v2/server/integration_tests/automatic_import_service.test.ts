/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, SavedObjectsClient } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AutomaticImportV2PluginStartDependencies } from '..';
import { AutomaticImportService } from '../services/automatic_import_service';
import { TASK_STATUSES } from '../services/saved_objects/constants';
import {
  mockAuthenticatedUser,
  mockIntegrationParams,
  mockDataStreamParams,
} from '../__mocks__/saved_objects';

describe('AutomaticImportService Integration Tests', () => {
  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let coreStart: InternalCoreStart;
  let automaticImportService: AutomaticImportService;

  const taskManagerSetupStub = {
    registerTaskDefinitions: jest.fn(),
  } as unknown as TaskManagerSetupContract;

  const taskManagerStartStub = {
    schedule: jest.fn(),
    runSoon: jest.fn(),
    get: jest.fn(),
    ensureScheduled: jest.fn(),
  } as unknown as TaskManagerStartContract;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    kbnRoot = createRootWithCorePlugins({}, { oss: false });
    await kbnRoot.preboot();
    const coreSetup = await kbnRoot.setup();

    automaticImportService = new AutomaticImportService(
      kbnRoot.logger,
      coreSetup.savedObjects,
      taskManagerSetupStub,
      coreSetup as unknown as CoreSetup<AutomaticImportV2PluginStartDependencies>
    );

    // Start Kibana after registering SO types in service constructor
    coreStart = await kbnRoot.start();
  });

  afterAll(async () => {
    await kbnRoot?.shutdown().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    const internalRepo = coreStart.savedObjects.createInternalRepository();
    const savedObjectsClient = internalRepo as unknown as SavedObjectsClient;
    await automaticImportService.initialize(savedObjectsClient, taskManagerStartStub);
  });

  it('getDataStreamResults returns results only when status is completed', async () => {
    const savedObjectService = (automaticImportService as any).savedObjectService;
    await savedObjectService.insertIntegration(
      { ...mockIntegrationParams, integrationId: 'itest-integration' },
      mockAuthenticatedUser
    );
    await savedObjectService.insertDataStream(
      {
        ...mockDataStreamParams,
        integrationId: 'itest-integration',
        dataStreamId: 'itest-ds',
        jobInfo: {
          jobId: 'job-1',
          jobType: 'autoImport-dataStream-task',
          status: TASK_STATUSES.pending,
        },
      },
      mockAuthenticatedUser
    );

    // Not completed yet
    await expect(
      automaticImportService.getDataStreamResults('itest-integration', 'itest-ds')
    ).rejects.toThrow('has not completed yet');

    // Mark completed with results
    const ingestPipelineObj = { processors: [{ set: { field: 'x', value: true } }] };
    const results = [{ a: 1 }, { b: 'two' }];
    await savedObjectService.updateDataStreamSavedObjectAttributes({
      integrationId: 'itest-integration',
      dataStreamId: 'itest-ds',
      ingestPipeline: ingestPipelineObj,
      pipelineDocs: results,
      status: TASK_STATUSES.completed,
    });

    const response = await automaticImportService.getDataStreamResults(
      'itest-integration',
      'itest-ds'
    );
    expect(response.ingest_pipeline).toEqual(ingestPipelineObj);
    expect(response.results).toEqual(results);
  });

  it('getDataStreamResults rejects when status is failed', async () => {
    const savedObjectService = (automaticImportService as any).savedObjectService;
    await savedObjectService.insertIntegration(
      { ...mockIntegrationParams, integrationId: 'itest-integration-failed' },
      mockAuthenticatedUser
    );
    await savedObjectService.insertDataStream(
      {
        ...mockDataStreamParams,
        integrationId: 'itest-integration-failed',
        dataStreamId: 'itest-ds-failed',
        jobInfo: {
          jobId: 'job-2',
          jobType: 'autoImport-dataStream-task',
          status: TASK_STATUSES.failed,
        },
      },
      mockAuthenticatedUser
    );

    await expect(
      automaticImportService.getDataStreamResults('itest-integration-failed', 'itest-ds-failed')
    ).rejects.toThrow('failed and has no results');
  });
});
