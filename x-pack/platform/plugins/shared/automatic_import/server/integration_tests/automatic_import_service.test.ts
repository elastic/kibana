/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreSetup, SavedObjectsClient } from '@kbn/core/server';
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
import type { AutomaticImportPluginStartDependencies } from '..';
import { AutomaticImportService } from '../services/automatic_import_service';
import type { AutomaticImportSavedObjectService } from '../services/saved_objects/saved_objects_service';
import type { IntegrationAttributes } from '../services/saved_objects/schemas/types';
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

    const mockAnalytics = {
      reportEvent: jest.fn(),
      registerEventType: jest.fn(),
    } as unknown as AnalyticsServiceSetup;

    const savedObjectsSetupWithNoopRegister = {
      ...coreSetup.savedObjects,
      registerType: () => {},
    };

    automaticImportService = new AutomaticImportService(
      kbnRoot.logger,
      savedObjectsSetupWithNoopRegister,
      taskManagerSetupStub,
      coreSetup as unknown as CoreSetup<AutomaticImportPluginStartDependencies>,
      mockAnalytics
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
    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;
    await automaticImportService.initialize(
      savedObjectsClient,
      taskManagerStartStub,
      internalEsClient
    );
  });

  it('getDataStreamResults returns results only when status is completed', async () => {
    const savedObjectService = (
      automaticImportService as unknown as { savedObjectService: AutomaticImportSavedObjectService }
    ).savedObjectService;
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
    const ingestPipelineObj = {
      name: 'test-pipeline',
      processors: [{ set: { field: 'x', value: true } }],
    };
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
    const savedObjectService = (
      automaticImportService as unknown as { savedObjectService: AutomaticImportSavedObjectService }
    ).savedObjectService;
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

  describe('resetApprovedStatus on data stream deletion', () => {
    it('should reset approved integration to completed when a data stream is deleted', async () => {
      const savedObjectService = (
        automaticImportService as unknown as {
          savedObjectService: AutomaticImportSavedObjectService;
        }
      ).savedObjectService;

      const integrationId = 'itest-reset-approved';

      // Create integration with two data streams
      await savedObjectService.insertIntegration(
        { ...mockIntegrationParams, integrationId },
        mockAuthenticatedUser
      );
      await savedObjectService.insertDataStream(
        {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'itest-reset-ds-1',
          jobInfo: {
            jobId: 'job-r1',
            jobType: 'autoImport-dataStream-task',
            status: TASK_STATUSES.completed,
          },
        },
        mockAuthenticatedUser
      );
      await savedObjectService.insertDataStream(
        {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'itest-reset-ds-2',
          jobInfo: {
            jobId: 'job-r2',
            jobType: 'autoImport-dataStream-task',
            status: TASK_STATUSES.completed,
          },
        },
        mockAuthenticatedUser
      );

      // Manually set the integration to approved status
      const integration = await savedObjectService.getIntegration(integrationId);
      const approvedData: IntegrationAttributes = {
        ...integration,
        status: TASK_STATUSES.approved,
        changelog: [
          {
            version: '1.0.0',
            changes: [
              { description: 'Initial release of Test Integration', type: 'enhancement', link: '' },
            ],
          },
        ],
      };
      await savedObjectService.updateIntegration(approvedData, '1.0.0');

      // Verify it's approved
      const beforeDelete = await savedObjectService.getIntegration(integrationId);
      expect(beforeDelete.status).toBe(TASK_STATUSES.approved);

      // Delete one data stream
      await automaticImportService.deleteDataStream(integrationId, 'itest-reset-ds-1');

      // Integration should now be completed, not approved
      const afterDelete = await savedObjectService.getIntegration(integrationId);
      expect(afterDelete.status).toBe(TASK_STATUSES.completed);

      // Version should be bumped and a changelog entry added
      expect(afterDelete.metadata.version).toBe('1.1.0');
      expect(afterDelete.changelog).toHaveLength(2);
      expect(afterDelete.changelog![0]).toEqual({
        version: '1.1.0',
        changes: [{ description: 'Updated Test Integration', type: 'enhancement', link: '' }],
      });
      expect(afterDelete.changelog![1].version).toBe('1.0.0');
    });

    it('should bump version and add changelog entry when resetting approved integration', async () => {
      const savedObjectService = (
        automaticImportService as unknown as {
          savedObjectService: AutomaticImportSavedObjectService;
        }
      ).savedObjectService;

      const integrationId = 'itest-reset-changelog';

      await savedObjectService.insertIntegration(
        { ...mockIntegrationParams, integrationId },
        mockAuthenticatedUser
      );
      await savedObjectService.insertDataStream(
        {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'itest-reset-cl-ds-1',
          jobInfo: {
            jobId: 'job-cl1',
            jobType: 'autoImport-dataStream-task',
            status: TASK_STATUSES.completed,
          },
        },
        mockAuthenticatedUser
      );
      await savedObjectService.insertDataStream(
        {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'itest-reset-cl-ds-2',
          jobInfo: {
            jobId: 'job-cl2',
            jobType: 'autoImport-dataStream-task',
            status: TASK_STATUSES.completed,
          },
        },
        mockAuthenticatedUser
      );

      // Approve at version 2.0.0 with an existing changelog entry
      const integration = await savedObjectService.getIntegration(integrationId);
      const approvedData: IntegrationAttributes = {
        ...integration,
        status: TASK_STATUSES.approved,
        changelog: [
          {
            version: '2.0.0',
            changes: [
              { description: 'Initial release of Test Integration', type: 'enhancement', link: '' },
            ],
          },
        ],
      };
      await savedObjectService.updateIntegration(approvedData, '2.0.0');

      // Delete a data stream — should bump to 2.0.1 and prepend changelog entry
      await automaticImportService.deleteDataStream(integrationId, 'itest-reset-cl-ds-1');

      const afterDelete = await savedObjectService.getIntegration(integrationId);
      expect(afterDelete.status).toBe(TASK_STATUSES.completed);
      expect(afterDelete.metadata.version).toBe('2.1.0');
      expect(afterDelete.changelog).toHaveLength(2);
      expect(afterDelete.changelog![0]).toEqual({
        version: '2.1.0',
        changes: [{ description: 'Updated Test Integration', type: 'enhancement', link: '' }],
      });
      expect(afterDelete.changelog![1].version).toBe('2.0.0');
    });

    it('should not change status of a non-approved integration on data stream deletion', async () => {
      const savedObjectService = (
        automaticImportService as unknown as {
          savedObjectService: AutomaticImportSavedObjectService;
        }
      ).savedObjectService;

      const integrationId = 'itest-no-reset';

      // Create integration with a completed data stream (status remains completed, not approved)
      await savedObjectService.insertIntegration(
        { ...mockIntegrationParams, integrationId },
        mockAuthenticatedUser
      );
      await savedObjectService.insertDataStream(
        {
          ...mockDataStreamParams,
          integrationId,
          dataStreamId: 'itest-no-reset-ds-1',
          jobInfo: {
            jobId: 'job-nr1',
            jobType: 'autoImport-dataStream-task',
            status: TASK_STATUSES.completed,
          },
        },
        mockAuthenticatedUser
      );

      // Verify it's not approved
      const beforeDelete = await savedObjectService.getIntegration(integrationId);
      expect(beforeDelete.status).not.toBe(TASK_STATUSES.approved);

      const statusBeforeDelete = beforeDelete.status;

      // Delete the data stream
      await automaticImportService.deleteDataStream(integrationId, 'itest-no-reset-ds-1');

      // Status should remain unchanged and no changelog entry added
      const afterDelete = await savedObjectService.getIntegration(integrationId);
      expect(afterDelete.status).toBe(statusBeforeDelete);
      expect(afterDelete.changelog).toBeUndefined();
    });
  });
});
