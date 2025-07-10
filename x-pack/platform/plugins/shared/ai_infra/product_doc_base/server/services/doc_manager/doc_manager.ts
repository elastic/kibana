/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreAuditService } from '@kbn/core/server';
import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { InstallationStatus } from '../../../common/install_status';
import type { ProductDocInstallClient } from '../doc_install_status';
import {
  INSTALL_ALL_TASK_ID,
  scheduleInstallAllTask,
  scheduleUninstallAllTask,
  scheduleEnsureUpToDateTask,
  getTaskStatus,
  waitUntilTaskCompleted,
} from '../../tasks';
import { checkLicense } from './check_license';
import type {
  DocumentationManagerAPI,
  DocGetStatusResponse,
  DocInstallOptions,
  DocUninstallOptions,
  DocUpdateOptions,
} from './types';
import { INSTALL_ALL_TASK_ID_MULTILINGUAL } from '../../tasks/install_all';

const TEN_MIN_IN_MS = 10 * 60 * 1000;

/**
 * High-level installation service, handling product documentation
 * installation as unary operations, abstracting away the fact
 * that documentation is composed of multiple entities.
 */
export class DocumentationManager implements DocumentationManagerAPI {
  private logger: Logger;
  private taskManager: TaskManagerStartContract;
  private licensing: LicensingPluginStart;
  private docInstallClient: ProductDocInstallClient;
  private auditService: CoreAuditService;

  constructor({
    logger,
    taskManager,
    licensing,
    docInstallClient,
    auditService,
  }: {
    logger: Logger;
    taskManager: TaskManagerStartContract;
    licensing: LicensingPluginStart;
    docInstallClient: ProductDocInstallClient;
    auditService: CoreAuditService;
  }) {
    this.logger = logger;
    this.taskManager = taskManager;
    this.licensing = licensing;
    this.docInstallClient = docInstallClient;
    this.auditService = auditService;
  }

  async install(options: DocInstallOptions): Promise<void> {
    const { request, force = false, wait = false } = options;
    const inferenceId = options.inferenceId ?? defaultInferenceEndpoints.ELSER;

    const { status } = await this.getStatus({ inferenceId });
    if (!force && status === 'installed') {
      return;
    }

    const license = await this.licensing.getLicense();
    if (!checkLicense(license)) {
      throw new Error('Elastic documentation requires an enterprise license');
    }

    const taskId = await scheduleInstallAllTask({
      taskManager: this.taskManager,
      logger: this.logger,
      inferenceId,
    });

    if (request) {
      this.auditService.asScoped(request).log({
        message:
          `User is requesting installation of product documentation for AI Assistants. Task ID=[${taskId}]` +
          (inferenceId ? `| Inference ID=[${inferenceId}]` : ''),
        event: {
          action: 'product_documentation_create',
          category: ['database'],
          type: ['creation'],
          outcome: 'unknown',
        },
      });
    }

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  async update(options: DocUpdateOptions): Promise<void> {
    const { request, wait = false, inferenceId } = options;

    const taskId = await scheduleEnsureUpToDateTask({
      taskManager: this.taskManager,
      logger: this.logger,
      inferenceId,
    });

    if (request) {
      this.auditService.asScoped(request).log({
        message:
          `User is requesting update of product documentation for AI Assistants. Task ID=[${taskId}]` +
          (inferenceId ? `| Inference ID=[${inferenceId}]` : ''),
        event: {
          action: 'product_documentation_update',
          category: ['database'],
          type: ['change'],
          outcome: 'unknown',
        },
      });
    }

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  async uninstall(options: DocUninstallOptions): Promise<void> {
    const { request, wait = false, inferenceId } = options;

    const taskId = await scheduleUninstallAllTask({
      taskManager: this.taskManager,
      logger: this.logger,
      inferenceId,
    });

    if (request) {
      this.auditService.asScoped(request).log({
        message: `User is requesting deletion of product documentation for AI Assistants. Task ID=[${taskId}]`,
        event: {
          action: 'product_documentation_delete',
          category: ['database'],
          type: ['deletion'],
          outcome: 'unknown',
        },
      });
    }

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  /**
   * @param inferenceId - The inference ID to get the status for. If not provided, the default ELSER inference ID will be used.
   */
  async getStatus({ inferenceId }: { inferenceId: string }): Promise<DocGetStatusResponse> {
    const taskId = isImpliedDefaultElserInferenceId(inferenceId)
      ? INSTALL_ALL_TASK_ID
      : INSTALL_ALL_TASK_ID_MULTILINGUAL;
    const taskStatus = await getTaskStatus({
      taskManager: this.taskManager,
      taskId,
    });
    if (taskStatus !== 'not_scheduled') {
      const status = convertTaskStatus(taskStatus);
      if (status !== 'unknown') {
        return { status };
      }
    }

    const installStatus = await this.docInstallClient.getInstallationStatus({ inferenceId });
    const overallStatus = getOverallStatus(Object.values(installStatus).map((v) => v.status));
    return { status: overallStatus, installStatus };
  }
}

const convertTaskStatus = (taskStatus: TaskStatus): InstallationStatus | 'unknown' => {
  switch (taskStatus) {
    case TaskStatus.Idle:
    case TaskStatus.Claiming:
    case TaskStatus.Running:
      return 'installing';
    case TaskStatus.Failed:
      return 'error';
    case TaskStatus.Unrecognized:
    case TaskStatus.DeadLetter:
    case TaskStatus.ShouldDelete:
    default:
      return 'unknown';
  }
};

const getOverallStatus = (statuses: InstallationStatus[]): InstallationStatus => {
  const statusOrder: InstallationStatus[] = ['error', 'installing', 'uninstalled', 'installed'];
  for (const status of statusOrder) {
    if (statuses.includes(status)) {
      return status;
    }
  }
  return 'installed';
};
