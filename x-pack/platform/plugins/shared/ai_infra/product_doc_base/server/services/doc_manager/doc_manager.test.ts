/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  securityServiceMock,
  httpServerMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { ProductDocInstallClient } from '../doc_install_status';
import { DocumentationManager } from './doc_manager';

jest.mock('../../tasks');
import {
  scheduleInstallAllTask,
  scheduleUninstallAllTask,
  scheduleEnsureUpToDateTask,
  scheduleEnsureSecurityLabsUpToDateTask,
  getInstallAllTaskStatus,
  waitUntilTaskCompleted,
} from '../../tasks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { ResourceTypes } from '@kbn/product-doc-common';
import { PRODUCT_DOC_INSTALL_LOCK_ID } from '../install_lock';

const scheduleInstallAllTaskMock = scheduleInstallAllTask as jest.MockedFn<
  typeof scheduleInstallAllTask
>;
const scheduleUninstallAllTaskMock = scheduleUninstallAllTask as jest.MockedFn<
  typeof scheduleUninstallAllTask
>;
const scheduleEnsureUpToDateTaskMock = scheduleEnsureUpToDateTask as jest.MockedFn<
  typeof scheduleEnsureUpToDateTask
>;
const scheduleEnsureSecurityLabsUpToDateTaskMock =
  scheduleEnsureSecurityLabsUpToDateTask as jest.MockedFn<
    typeof scheduleEnsureSecurityLabsUpToDateTask
  >;
const waitUntilTaskCompletedMock = waitUntilTaskCompleted as jest.MockedFn<
  typeof waitUntilTaskCompleted
>;
const getInstallAllTaskStatusMock = getInstallAllTaskStatus as jest.MockedFn<
  typeof getInstallAllTaskStatus
>;

const DEFAULT_INFERENCE_ID = defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL;
describe('DocumentationManager', () => {
  let logger: MockedLogger;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let licensing: ReturnType<typeof licensingMock.createStart>;
  let auditService: ReturnType<typeof securityServiceMock.createStart>['audit'];
  let docInstallClient: jest.Mocked<ProductDocInstallClient>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let packageInstaller: {
    installSecurityLabs: jest.Mock;
    uninstallSecurityLabs: jest.Mock;
    getSecurityLabsStatus: jest.Mock;
  };

  let docManager: DocumentationManager;
  let withLock: jest.Mock;

  beforeEach(() => {
    logger = loggerMock.create();
    taskManager = taskManagerMock.createStart();
    licensing = licensingMock.createStart();
    auditService = securityServiceMock.createStart().audit;
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.inference.get.mockResolvedValue({
      endpoints: [
        {
          inference_id: defaultInferenceEndpoints.JINAv5,
          task_type: 'text_embedding',
          service: 'elasticsearch',
          service_settings: {},
        },
      ],
    });
    packageInstaller = {
      installSecurityLabs: jest.fn().mockResolvedValue(undefined),
      uninstallSecurityLabs: jest.fn().mockResolvedValue(undefined),
      getSecurityLabsStatus: jest.fn().mockResolvedValue({ status: 'uninstalled' }),
    };

    docInstallClient = {
      getInstallationStatus: jest.fn(),
      getPreviouslyInstalledInferenceIds: jest
        .fn()
        .mockResolvedValue([
          defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
          defaultInferenceEndpoints.ELSER,
        ]),
      getPreviouslyInstalledSecurityLabsInferenceIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ProductDocInstallClient>;

    withLock = jest.fn((_lockId: string, callback: () => Promise<unknown>) => callback());
    docManager = new DocumentationManager({
      logger,
      taskManager,
      licensing,
      auditService,
      docInstallClient,
      esClient,
      lockManager: { withLock },
      packageInstaller: packageInstaller as unknown as ConstructorParameters<
        typeof DocumentationManager
      >[0]['packageInstaller'],
    });
  });

  afterEach(() => {
    scheduleInstallAllTaskMock.mockReset();
    scheduleUninstallAllTaskMock.mockReset();
    scheduleEnsureUpToDateTaskMock.mockReset();
    scheduleEnsureSecurityLabsUpToDateTaskMock.mockReset();
    waitUntilTaskCompletedMock.mockReset();
    getInstallAllTaskStatusMock.mockReset();
  });

  describe('#install', () => {
    beforeEach(() => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );

      getInstallAllTaskStatusMock.mockResolvedValue('none');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleInstallAllTask`', async () => {
      await docManager.install({ inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleInstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: DEFAULT_INFERENCE_ID,
        force: false,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      docInstallClient.getInstallationStatus
        .mockResolvedValueOnce({
          kibana: { status: 'uninstalled' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>)
        .mockResolvedValueOnce({
          kibana: { status: 'installed' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.install({ wait: true, inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('does not call scheduleInstallAllTask if already installed and not force', async () => {
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.install({ wait: true, inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.install({
        force: false,
        wait: false,
        request,
        inferenceId: DEFAULT_INFERENCE_ID,
      });

      expect(auditLog.log).toHaveBeenCalledTimes(1);
      expect(auditLog.log).toHaveBeenCalledWith({
        message: expect.any(String),
        event: {
          action: 'product_documentation_create',
          category: ['database'],
          type: ['creation'],
          outcome: 'unknown',
        },
      });
    });

    it('throws an error if license level is not sufficient', async () => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'basic' } })
      );

      await expect(
        docManager.install({ force: false, wait: false, inferenceId: DEFAULT_INFERENCE_ID })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Elastic documentation requires an enterprise license"`
      );
    });
  });

  describe('#update', () => {
    beforeEach(() => {
      getInstallAllTaskStatusMock.mockResolvedValue('none');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleEnsureUpToDateTask`', async () => {
      await docManager.update({ inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: DEFAULT_INFERENCE_ID,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      await docManager.update({ wait: true, inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.update({ wait: false, request, inferenceId: DEFAULT_INFERENCE_ID });

      expect(auditLog.log).toHaveBeenCalledTimes(1);
      expect(auditLog.log).toHaveBeenCalledWith({
        message: expect.any(String),
        event: {
          action: 'product_documentation_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
      });
    });
  });

  describe('#ensureDefaultProductDocumentation', () => {
    beforeEach(() => {
      getInstallAllTaskStatusMock.mockResolvedValue('none');
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );
    });

    it('installs when default inference ID documentation is not installed', async () => {
      docInstallClient.getInstallationStatus
        .mockResolvedValueOnce({
          kibana: { status: 'uninstalled' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>)
        .mockResolvedValueOnce({
          kibana: { status: 'uninstalled' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.ensureDefaultProductDocumentation();

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.JINAv5,
        force: false,
      });
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalled();
    });

    it('schedules no task when default inference ID documentation is already installed', async () => {
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.ensureDefaultProductDocumentation();

      // Updates for already-installed IDs are handled by updateAll() on startup
      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalled();
    });

    it('reinstalls when default inference ID documentation is in error state', async () => {
      docInstallClient.getInstallationStatus
        .mockResolvedValueOnce({
          kibana: { status: 'error' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>)
        .mockResolvedValueOnce({
          kibana: { status: 'error' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.ensureDefaultProductDocumentation();

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.JINAv5,
        force: false,
      });
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalled();
    });

    it('skips when default inference ID documentation is currently installing', async () => {
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installing' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.ensureDefaultProductDocumentation();

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalled();
    });

    it('skips when default inference ID documentation is currently uninstalling', async () => {
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalling' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.ensureDefaultProductDocumentation();

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalled();
    });
  });

  describe('#ensureDefaultSecurityLabs', () => {
    beforeEach(() => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );
    });

    it('installs when Security Labs is not installed', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'uninstalled' });

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.JINAv5,
        version: undefined,
      });
    });

    it('installs under the shared install lock', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'uninstalled' });
      let installedUnderLock = false;
      withLock.mockImplementation(async (_lockId: string, callback: () => Promise<unknown>) => {
        await callback();
        installedUnderLock = packageInstaller.installSecurityLabs.mock.calls.length === 1;
      });

      await docManager.ensureDefaultSecurityLabs();

      expect(withLock).toHaveBeenCalledWith(
        PRODUCT_DOC_INSTALL_LOCK_ID,
        expect.any(Function),
        expect.anything()
      );
      expect(installedUnderLock).toBe(true);
    });

    it('skips the install when Security Labs was installed while waiting for the lock', async () => {
      packageInstaller.getSecurityLabsStatus
        .mockResolvedValueOnce({ status: 'uninstalled' }) // before the lock
        .mockResolvedValueOnce({ status: 'installed' }); // under the lock, after another node

      await docManager.ensureDefaultSecurityLabs();

      expect(withLock).toHaveBeenCalledTimes(1);
      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
    });

    it('installs once when two startup calls make the same pre-lock decision', async () => {
      let installed = false;
      packageInstaller.getSecurityLabsStatus.mockImplementation(async () => ({
        status: installed ? 'installed' : 'uninstalled',
      }));
      packageInstaller.installSecurityLabs.mockImplementation(async () => {
        installed = true;
      });
      // both calls read the status before either enters the lock; the lock then serializes them
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let queue: Promise<unknown> = Promise.resolve();
      withLock.mockImplementation((_lockId: string, callback: () => Promise<unknown>) => {
        const run = queue.then(async () => {
          await gate;
          await callback();
        });
        queue = run.catch(() => undefined);
        return run;
      });

      const first = docManager.ensureDefaultSecurityLabs();
      const second = docManager.ensureDefaultSecurityLabs();
      await new Promise((resolve) => setImmediate(resolve));
      release();
      await Promise.all([first, second]);

      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledTimes(1);
    });

    it('schedules no install when Security Labs is already installed', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'installed' });

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
      expect(scheduleEnsureSecurityLabsUpToDateTaskMock).not.toHaveBeenCalled();
    });

    it('installs when Security Labs is in error state', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'error' });

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.JINAv5,
        version: undefined,
      });
    });

    it('skips when Security Labs is currently installing', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'installing' });

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
    });

    it('skips when Security Labs is currently uninstalling', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'uninstalling' });

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
    });

    it('skips when license is invalid', async () => {
      packageInstaller.getSecurityLabsStatus.mockResolvedValue({ status: 'uninstalled' });
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'basic' } })
      );

      await docManager.ensureDefaultSecurityLabs();

      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
    });
  });

  describe('#updateAll', () => {
    beforeEach(() => {
      getInstallAllTaskStatusMock.mockResolvedValue('none');
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleEnsureUpToDateTask` for each inferenceId when the default is unchanged', async () => {
      esClient.inference.get.mockResolvedValue({
        endpoints: [
          {
            inference_id: defaultInferenceEndpoints.ELSER,
            task_type: 'text_embedding',
            service: 'elasticsearch',
            service_settings: {},
          },
        ],
      });

      await docManager.updateAll();

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(2);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('deletes ELSER documentation and installs Jina when the default inference changed', async () => {
      docInstallClient.getInstallationStatus
        .mockResolvedValueOnce({
          kibana: { status: 'uninstalled' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>)
        .mockResolvedValueOnce({
          kibana: { status: 'installed' },
        } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.updateAll();

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.JINAv5,
        force: false,
      });
      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
        resourceType: ResourceTypes.productDoc,
      });
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.JINAv5 })
      );
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.ELSER })
      );
    });

    it('removes ELSER without reinstalling when Jina documentation is already installed', async () => {
      docInstallClient.getPreviouslyInstalledInferenceIds.mockResolvedValue([
        defaultInferenceEndpoints.JINAv5,
        defaultInferenceEndpoints.ELSER,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      ]);

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.updateAll();

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
        resourceType: ResourceTypes.productDoc,
      });
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.JINAv5 })
      );
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.ELSER })
      );
    });

    it('still updates the current default when a user forces an update', async () => {
      docInstallClient.getPreviouslyInstalledInferenceIds.mockResolvedValue([
        defaultInferenceEndpoints.JINAv5,
        defaultInferenceEndpoints.ELSER,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      ]);
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.updateAll({
        forceUpdate: true,
        inferenceIds: [defaultInferenceEndpoints.JINAv5],
      });

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
        resourceType: ResourceTypes.productDoc,
      });
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.JINAv5,
        forceUpdate: true,
      });
    });

    it('does not switch models when the default inference ID cannot be resolved', async () => {
      esClient.inference.get.mockRejectedValue(new Error('inference unavailable'));

      await docManager.updateAll();

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('does not remove ELSER when only a custom inference ID is updated', async () => {
      await docManager.updateAll({
        inferenceIds: [defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL],
      });

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });
    });

    it('keeps ELSER installed when the Jina install does not complete', async () => {
      await docManager.updateAll();

      expect(scheduleInstallAllTaskMock).toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.ELSER })
      );
    });

    it('keeps ELSER installed when the new default cannot be installed', async () => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'basic' } })
      );

      await docManager.updateAll();

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleUninstallAllTaskMock).not.toHaveBeenCalled();
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.ELSER })
      );
      expect(scheduleEnsureUpToDateTaskMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ inferenceId: defaultInferenceEndpoints.JINAv5 })
      );
    });
  });

  describe('#updateSecurityLabsAll', () => {
    beforeEach(() => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );
      docInstallClient.getPreviouslyInstalledSecurityLabsInferenceIds.mockResolvedValue([
        defaultInferenceEndpoints.ELSER,
      ]);
    });

    it('deletes ELSER Security Labs content and installs Jina when the default changed', async () => {
      await docManager.updateSecurityLabsAll();

      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.JINAv5,
        version: undefined,
      });
      expect(packageInstaller.uninstallSecurityLabs).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(scheduleEnsureSecurityLabsUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureSecurityLabsUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.JINAv5,
      });
    });

    it('keeps ELSER Security Labs content when the new default cannot be installed', async () => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'basic' } })
      );

      await docManager.updateSecurityLabsAll();

      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();
      expect(packageInstaller.uninstallSecurityLabs).not.toHaveBeenCalled();
      expect(scheduleEnsureSecurityLabsUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });
  });

  describe('#uninstall', () => {
    beforeEach(() => {
      getInstallAllTaskStatusMock.mockResolvedValue('none');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleUninstallAllTask`', async () => {
      await docManager.uninstall({ inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
        inferenceId: DEFAULT_INFERENCE_ID,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      await docManager.uninstall({ wait: true, inferenceId: DEFAULT_INFERENCE_ID });

      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.uninstall({ wait: false, request, inferenceId: DEFAULT_INFERENCE_ID });

      expect(auditLog.log).toHaveBeenCalledTimes(1);
      expect(auditLog.log).toHaveBeenCalledWith({
        message: expect.any(String),
        event: {
          action: 'product_documentation_delete',
          category: ['database'],
          type: ['deletion'],
          outcome: 'unknown',
        },
      });
    });
  });
});
