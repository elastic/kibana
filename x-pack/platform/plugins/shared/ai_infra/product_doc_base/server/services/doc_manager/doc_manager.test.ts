/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { securityServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { ProductDocInstallClient } from '../doc_install_status';
import { DocumentationManager } from './doc_manager';

jest.mock('../../tasks');
import {
  scheduleInstallAllTask,
  scheduleUninstallAllTask,
  scheduleEnsureUpToDateTask,
  getTaskStatus,
  waitUntilTaskCompleted,
} from '../../tasks';

const scheduleInstallAllTaskMock = scheduleInstallAllTask as jest.MockedFn<
  typeof scheduleInstallAllTask
>;
const scheduleUninstallAllTaskMock = scheduleUninstallAllTask as jest.MockedFn<
  typeof scheduleUninstallAllTask
>;
const scheduleEnsureUpToDateTaskMock = scheduleEnsureUpToDateTask as jest.MockedFn<
  typeof scheduleEnsureUpToDateTask
>;
const waitUntilTaskCompletedMock = waitUntilTaskCompleted as jest.MockedFn<
  typeof waitUntilTaskCompleted
>;
const getTaskStatusMock = getTaskStatus as jest.MockedFn<typeof getTaskStatus>;

describe('DocumentationManager', () => {
  let logger: MockedLogger;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let licensing: ReturnType<typeof licensingMock.createStart>;
  let auditService: ReturnType<typeof securityServiceMock.createStart>['audit'];
  let docInstallClient: jest.Mocked<ProductDocInstallClient>;

  let docManager: DocumentationManager;

  beforeEach(() => {
    logger = loggerMock.create();
    taskManager = taskManagerMock.createStart();
    licensing = licensingMock.createStart();
    auditService = securityServiceMock.createStart().audit;

    docInstallClient = {
      getInstallationStatus: jest.fn(),
    } as unknown as jest.Mocked<ProductDocInstallClient>;

    docManager = new DocumentationManager({
      logger,
      taskManager,
      licensing,
      auditService,
      docInstallClient,
    });
  });

  afterEach(() => {
    scheduleInstallAllTaskMock.mockReset();
    scheduleUninstallAllTaskMock.mockReset();
    scheduleEnsureUpToDateTaskMock.mockReset();
    waitUntilTaskCompletedMock.mockReset();
    getTaskStatusMock.mockReset();
  });

  describe('#install', () => {
    beforeEach(() => {
      licensing.getLicense.mockResolvedValue(
        licensingMock.createLicense({ license: { type: 'enterprise' } })
      );

      getTaskStatusMock.mockResolvedValue('not_scheduled');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleInstallAllTask`', async () => {
      await docManager.install({});

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleInstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      await docManager.install({ wait: true });

      expect(scheduleInstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('does not call scheduleInstallAllTask if already installed and not force', async () => {
      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);

      await docManager.install({ wait: true });

      expect(scheduleInstallAllTaskMock).not.toHaveBeenCalled();
      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.install({ force: false, wait: false, request });

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
        docManager.install({ force: false, wait: false })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Elastic documentation requires an enterprise license"`
      );
    });
  });

  describe('#update', () => {
    beforeEach(() => {
      getTaskStatusMock.mockResolvedValue('not_scheduled');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleEnsureUpToDateTask`', async () => {
      await docManager.update({});

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      await docManager.update({ wait: true });

      expect(scheduleEnsureUpToDateTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.update({ wait: false, request });

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

  describe('#uninstall', () => {
    beforeEach(() => {
      getTaskStatusMock.mockResolvedValue('not_scheduled');

      docInstallClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as Awaited<ReturnType<ProductDocInstallClient['getInstallationStatus']>>);
    });

    it('calls `scheduleUninstallAllTask`', async () => {
      await docManager.uninstall({});

      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledWith({
        taskManager,
        logger,
      });

      expect(waitUntilTaskCompletedMock).not.toHaveBeenCalled();
    });

    it('calls waitUntilTaskCompleted if wait=true', async () => {
      await docManager.uninstall({ wait: true });

      expect(scheduleUninstallAllTaskMock).toHaveBeenCalledTimes(1);
      expect(waitUntilTaskCompletedMock).toHaveBeenCalledTimes(1);
    });

    it('records an audit log when request is provided', async () => {
      const request = httpServerMock.createKibanaRequest();

      const auditLog = auditService.withoutRequest;
      auditService.asScoped = jest.fn(() => auditLog);

      await docManager.uninstall({ wait: false, request });

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
