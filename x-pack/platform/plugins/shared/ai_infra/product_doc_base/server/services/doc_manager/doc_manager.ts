/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreAuditService, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core/server';
import {
  getDefaultInferenceIndexKey,
  planDefaultInferenceMigration,
  ResourceTypes,
  resolveDefaultInferenceId,
  resolveDefaultInferenceIdFromInferenceGet,
  type ResourceType,
} from '@kbn/product-doc-common';
import type { InstallationStatus, ProductInstallState } from '../../../common/install_status';
import type { ProductDocInstallClient } from '../doc_install_status';
import {
  getInstallAllTaskStatus,
  INSTALL_TASK_WAIT_TIMEOUT_MS,
  scheduleInstallAllTask,
  scheduleUninstallAllTask,
  scheduleEnsureUpToDateTask,
  scheduleEnsureSecurityLabsUpToDateTask,
  waitUntilTaskCompleted,
} from '../../tasks';
import { checkLicense } from './check_license';
import type {
  DocumentationManagerAPI,
  DocGetStatusResponse,
  DocInstallOptions,
  DocUninstallOptions,
  DocUpdateOptions,
  DocUpdateAllOptions,
  SecurityLabsInstallOptions,
  SecurityLabsUninstallOptions,
  SecurityLabsStatusResponse,
} from './types';
import type { PerformUpdateResponse } from '../../../common/http_api/installation';
import type { PackageInstaller } from '../package_installer';
import { waitForInstallLock, type InstallLockManager } from '../install_lock';

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
  private packageInstaller?: PackageInstaller;
  private esClient: ElasticsearchClient;
  private lockManager: InstallLockManager;

  constructor({
    logger,
    taskManager,
    licensing,
    docInstallClient,
    auditService,
    packageInstaller,
    esClient,
    lockManager,
  }: {
    logger: Logger;
    taskManager: TaskManagerStartContract;
    licensing: LicensingPluginStart;
    docInstallClient: ProductDocInstallClient;
    auditService: CoreAuditService;
    packageInstaller?: PackageInstaller;
    esClient: ElasticsearchClient;
    lockManager: InstallLockManager;
  }) {
    this.logger = logger;
    this.taskManager = taskManager;
    this.licensing = licensing;
    this.docInstallClient = docInstallClient;
    this.auditService = auditService;
    this.packageInstaller = packageInstaller;
    this.esClient = esClient;
    this.lockManager = lockManager;
  }

  async install(options: DocInstallOptions): Promise<void> {
    const {
      request,
      force = false,
      wait = false,
      waitTimeoutMs = INSTALL_TASK_WAIT_TIMEOUT_MS,
    } = options;
    const inferenceId = options.inferenceId ?? defaultInferenceEndpoints.ELSER;

    const { status: previousStatus } = await this.getStatus({ inferenceId });
    if (!force && previousStatus === 'installed') {
      await this.uninstallSupersededDefaultInferenceIds(inferenceId, request);
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
      force,
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

    if (!wait) {
      return;
    }

    await waitUntilTaskCompleted({
      taskManager: this.taskManager,
      taskId,
      timeout: waitTimeoutMs,
    });
    const { status } = await this.getStatus({ inferenceId });
    // A failed install must not delete the previous model's documentation.
    if (status !== 'installed') {
      return;
    }
    await this.uninstallSupersededDefaultInferenceIds(inferenceId, request);
  }

  async update(options: DocUpdateOptions): Promise<void> {
    const {
      request,
      wait = false,
      waitTimeoutMs = INSTALL_TASK_WAIT_TIMEOUT_MS,
      inferenceId,
      forceUpdate,
    } = options;

    const taskId = await scheduleEnsureUpToDateTask({
      taskManager: this.taskManager,
      logger: this.logger,
      inferenceId,
      forceUpdate,
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
        timeout: waitTimeoutMs,
      });
    }
  }

  async ensureDefaultProductDocumentation(): Promise<void> {
    const inferenceId = await resolveDefaultInferenceIdFromInferenceGet(
      () => this.esClient.inference.get({}),
      { resourceType: ResourceTypes.productDoc }
    );
    const { status } = await this.getStatus({ inferenceId });

    this.logger.info(
      `Ensuring product documentation for default inference ID [${inferenceId}] (status: ${status})`
    );

    if (status === 'uninstalled' || status === 'error') {
      const license = await this.licensing.getLicense();
      if (!checkLicense(license)) {
        this.logger.debug(
          `Skipping product documentation install for inference ID [${inferenceId}]: invalid license`
        );
        return;
      }
      await this.install({ inferenceId });
      return;
    }

    if (status === 'installing' || status === 'uninstalling') {
      this.logger.debug(
        `Skipping product documentation for inference ID [${inferenceId}]: installation already in progress (status: ${status})`
      );
      return;
    }

    // 'installed' — updateAll() on startup handles updates for all installed IDs including this one
    this.logger.debug(
      `Product documentation for inference ID [${inferenceId}] is already installed; update will be handled by updateAll`
    );
  }

  async updateAll(options?: DocUpdateAllOptions): Promise<{ inferenceIds: string[] }> {
    const { forceUpdate, inferenceIds, request, wait = false } = options ?? {};
    const previouslyInstalled =
      (await this.docInstallClient.getPreviouslyInstalledInferenceIds()) ?? [];
    const explicitRequest = Array.isArray(inferenceIds) && inferenceIds.length > 0;
    const requestedIds = explicitRequest ? inferenceIds : previouslyInstalled;

    const currentDefaultInferenceId = await this.resolveCurrentDefaultInferenceId(
      ResourceTypes.productDoc
    );
    const migration = currentDefaultInferenceId
      ? planDefaultInferenceMigration({
          installedInferenceIds: previouslyInstalled,
          currentDefaultInferenceId,
          requestedInferenceIds: explicitRequest ? inferenceIds : undefined,
        })
      : undefined;

    // One budget for every wait below, so the whole call stays under the route's idle socket.
    const deadline = Date.now() + INSTALL_TASK_WAIT_TIMEOUT_MS;
    const remainingWaitMs = () => Math.max(deadline - Date.now(), 0);

    let idsToUpdate = requestedIds;
    if (migration) {
      const supersededKeys = new Set(
        migration.supersededInferenceIds.map((inferenceId) =>
          getDefaultInferenceIndexKey(inferenceId)
        )
      );
      const currentKey = getDefaultInferenceIndexKey(migration.currentDefaultInferenceId);
      const includesCurrent = () =>
        idsToUpdate.some((inferenceId) => getDefaultInferenceIndexKey(inferenceId) === currentKey);
      const withoutCurrent = () => {
        idsToUpdate = idsToUpdate.filter(
          (inferenceId) => getDefaultInferenceIndexKey(inferenceId) !== currentKey
        );
      };

      // The previous default is only dropped from the update list once the switch succeeded.
      // Otherwise it keeps being updated, so a failed or skipped switch never leaves stale docs.
      let switched = false;

      // Some (not all) products of the current default may be installed, or its install may still
      // be running. Only delete the previous default once the current one is fully installed.
      const currentStatus = migration.installCurrentDefault
        ? 'uninstalled'
        : (await this.getStatus({ inferenceId: migration.currentDefaultInferenceId })).status;
      if (currentStatus === 'uninstalled' || currentStatus === 'error') {
        const license = await this.licensing.getLicense();
        if (!checkLicense(license)) {
          this.logger.warn(
            `Skipping product documentation inference switch to [${
              migration.currentDefaultInferenceId
            }]: invalid license. Documentation for [${migration.supersededInferenceIds.join(
              ', '
            )}] is kept`
          );
        } else {
          // Wait so the previous default is removed only after the new documentation is installed.
          await this.install({
            inferenceId: migration.currentDefaultInferenceId,
            request,
            wait: true,
            waitTimeoutMs: remainingWaitMs(),
          });
          const { status } = await this.getStatus({
            inferenceId: migration.currentDefaultInferenceId,
          });
          switched = status === 'installed';
          if (switched) {
            // install() already wrote this model. The update loop below would install it again.
            withoutCurrent();
          } else {
            this.logger.warn(
              `Product documentation for [${
                migration.currentDefaultInferenceId
              }] is not installed (status [${status}]); documentation for [${migration.supersededInferenceIds.join(
                ', '
              )}] is kept`
            );
          }
        }
      } else if (currentStatus === 'installed') {
        this.logger.info(
          `Default inference ID changed to [${
            migration.currentDefaultInferenceId
          }]; removing product documentation for [${migration.supersededInferenceIds.join(', ')}]`
        );
        await this.uninstallInferenceIds(migration.supersededInferenceIds, request);
        switched = true;
        if (forceUpdate) {
          if (!includesCurrent()) {
            idsToUpdate = [...idsToUpdate, migration.currentDefaultInferenceId];
          }
        } else {
          // Already installed. update() below would schedule another install of this model.
          withoutCurrent();
        }
      } else if (!includesCurrent()) {
        idsToUpdate = [...idsToUpdate, migration.currentDefaultInferenceId];
      }

      if (switched) {
        idsToUpdate = idsToUpdate.filter(
          (inferenceId) => !supersededKeys.has(getDefaultInferenceIndexKey(inferenceId))
        );
      }
    }

    this.logger.info(
      `Updating product documentation to latest version for Inference IDs: ${idsToUpdate}`
    );
    await Promise.all(
      idsToUpdate.map((inferenceId) =>
        this.update({
          inferenceId,
          forceUpdate,
          request,
          wait,
          waitTimeoutMs: remainingWaitMs(),
        })
      )
    );
    return {
      inferenceIds: idsToUpdate,
    };
  }

  /**
   * Deletes documentation installed for a previous default model when `keepingInferenceId`
   * is the current default. A failure to resolve the default leaves the existing docs in place.
   */
  private async uninstallSupersededDefaultInferenceIds(
    keepingInferenceId: string,
    request?: KibanaRequest
  ): Promise<void> {
    const currentDefaultInferenceId = await this.resolveCurrentDefaultInferenceId(
      ResourceTypes.productDoc
    );
    if (
      !currentDefaultInferenceId ||
      getDefaultInferenceIndexKey(keepingInferenceId) !==
        getDefaultInferenceIndexKey(currentDefaultInferenceId)
    ) {
      return;
    }

    const previouslyInstalled =
      (await this.docInstallClient.getPreviouslyInstalledInferenceIds()) ?? [];
    const migration = planDefaultInferenceMigration({
      installedInferenceIds: previouslyInstalled,
      currentDefaultInferenceId,
      requestedInferenceIds: [keepingInferenceId],
    });
    if (!migration) {
      return;
    }

    this.logger.info(
      `Removing product documentation for previous default inference ID [${migration.supersededInferenceIds.join(
        ', '
      )}] after switching to [${currentDefaultInferenceId}]`
    );
    await this.uninstallInferenceIds(migration.supersededInferenceIds, request);
  }

  private async uninstallInferenceIds(
    inferenceIds: string[],
    request?: KibanaRequest
  ): Promise<void> {
    for (const inferenceId of inferenceIds) {
      // Product docs only: the OpenAPI spec index is not replaced by a product docs install.
      await this.uninstall({ inferenceId, request, resourceType: ResourceTypes.productDoc });
    }
  }

  private async resolveCurrentDefaultInferenceId(
    resourceType: ResourceType
  ): Promise<string | undefined> {
    try {
      const result = await this.esClient.inference.get({});
      const endpointIds = new Set(
        (result.endpoints ?? []).map((endpoint) => endpoint.inference_id)
      );
      return resolveDefaultInferenceId(endpointIds, { resourceType });
    } catch (error) {
      this.logger.warn(
        `Unable to resolve the default inference ID; installed documentation will not switch models: ${
          (error as Error).message
        }`
      );
      return undefined;
    }
  }

  async ensureDefaultSecurityLabs(): Promise<void> {
    const inferenceId = await resolveDefaultInferenceIdFromInferenceGet(
      () => this.esClient.inference.get({}),
      { resourceType: ResourceTypes.securityLabs }
    );
    const { status } = await this.getSecurityLabsStatus({ inferenceId });

    this.logger.info(
      `Ensuring Security Labs content for default inference ID [${inferenceId}] (status: ${status})`
    );

    if (status === 'uninstalled' || status === 'error') {
      const license = await this.licensing.getLicense();
      if (!checkLicense(license)) {
        this.logger.debug(
          `Skipping Security Labs install for inference ID [${inferenceId}]: invalid license`
        );
        return;
      }
      await this.installDefaultSecurityLabs(inferenceId);
      return;
    }

    if (status === 'installing' || status === 'uninstalling') {
      this.logger.debug(
        `Skipping Security Labs for inference ID [${inferenceId}]: installation already in progress (status: ${status})`
      );
      return;
    }

    // 'installed' — updateSecurityLabsAll() on startup handles updates for installed IDs
    this.logger.debug(
      `Security Labs for inference ID [${inferenceId}] is already installed; update will be handled by updateSecurityLabsAll`
    );
  }

  // The status is checked again under the lock so that nodes starting together do not each
  // reinstall the content the first one has just installed
  private async installDefaultSecurityLabs(inferenceId: string): Promise<void> {
    await this.runUnderInstallLock(
      {
        source: 'ensureDefaultSecurityLabs',
        inferenceId,
        failure: 'install Security Labs content',
      },
      async (installer) => {
        const { status } = await this.getSecurityLabsStatus({ inferenceId });
        if (status === 'installed') {
          this.logger.debug(
            `Security Labs for inference ID [${inferenceId}] was installed while waiting for the install lock`
          );
          return;
        }
        await installer.installSecurityLabs({ inferenceId });
      }
    );
  }

  private async runUnderInstallLock(
    { source, inferenceId, failure }: { source: string; inferenceId?: string; failure: string },
    run: (installer: PackageInstaller) => Promise<void>
  ): Promise<void> {
    const { packageInstaller } = this;
    if (!packageInstaller) {
      throw new Error('PackageInstaller not available');
    }
    try {
      await waitForInstallLock({
        lockManager: this.lockManager,
        metadata: { source, inferenceId },
        run: () => run(packageInstaller),
      });
    } catch (error) {
      this.logger.error(`Failed to ${failure}: ${error.message}`);
      throw error;
    }
  }

  async updateSecurityLabsAll(options?: {
    forceUpdate?: boolean;
  }): Promise<{ inferenceIds: string[] }> {
    const { forceUpdate } = options ?? {};
    const previouslyInstalled =
      (await this.docInstallClient.getPreviouslyInstalledSecurityLabsInferenceIds()) ?? [];
    const currentDefaultInferenceId = await this.resolveCurrentDefaultInferenceId(
      ResourceTypes.securityLabs
    );
    const migration = currentDefaultInferenceId
      ? planDefaultInferenceMigration({
          installedInferenceIds: previouslyInstalled,
          currentDefaultInferenceId,
        })
      : undefined;

    let idsToUpdate = previouslyInstalled;
    if (migration) {
      const canReplace = await this.replaceSecurityLabsInference(migration);
      if (canReplace) {
        const supersededKeys = new Set(
          migration.supersededInferenceIds.map((inferenceId) =>
            getDefaultInferenceIndexKey(inferenceId)
          )
        );
        idsToUpdate = previouslyInstalled.filter(
          (inferenceId) => !supersededKeys.has(getDefaultInferenceIndexKey(inferenceId))
        );
        const currentKey = getDefaultInferenceIndexKey(migration.currentDefaultInferenceId);
        if (
          !idsToUpdate.some(
            (inferenceId) => getDefaultInferenceIndexKey(inferenceId) === currentKey
          )
        ) {
          idsToUpdate = [...idsToUpdate, migration.currentDefaultInferenceId];
        }
      }
    }

    if (idsToUpdate.length === 0) {
      return { inferenceIds: [] };
    }
    this.logger.info(
      `Updating Security Labs content to latest version for Inference IDs: ${idsToUpdate}`
    );
    await Promise.all(
      idsToUpdate.map((inferenceId) =>
        scheduleEnsureSecurityLabsUpToDateTask({
          taskManager: this.taskManager,
          logger: this.logger,
          inferenceId,
          forceUpdate,
        })
      )
    );
    return { inferenceIds: idsToUpdate };
  }

  /**
   * Installs Security Labs for the new default and deletes the previous default.
   * Returns false when the new default is not installed afterwards, leaving the previous content in place.
   */
  private async replaceSecurityLabsInference(migration: {
    currentDefaultInferenceId: string;
    supersededInferenceIds: string[];
    installCurrentDefault: boolean;
  }): Promise<boolean> {
    this.logger.info(
      `Default inference ID changed to [${
        migration.currentDefaultInferenceId
      }]; removing Security Labs content for [${migration.supersededInferenceIds.join(', ')}]`
    );
    if (migration.installCurrentDefault) {
      const license = await this.licensing.getLicense();
      if (!checkLicense(license)) {
        this.logger.warn(
          `Skipping Security Labs inference switch to [${migration.currentDefaultInferenceId}]: invalid license`
        );
        return false;
      }
      await this.installDefaultSecurityLabs(migration.currentDefaultInferenceId);
    }
    // A failed install must not delete the previous model's content.
    const { status } = await this.getSecurityLabsStatus({
      inferenceId: migration.currentDefaultInferenceId,
    });
    if (status !== 'installed') {
      this.logger.warn(
        `Security Labs content for [${
          migration.currentDefaultInferenceId
        }] is not installed (status [${status}]); content for [${migration.supersededInferenceIds.join(
          ', '
        )}] is kept`
      );
      return false;
    }
    for (const inferenceId of migration.supersededInferenceIds) {
      await this.uninstallSecurityLabs({ inferenceId });
    }
    return true;
  }

  async uninstall(options: DocUninstallOptions): Promise<void> {
    const { request, wait = false, inferenceId, resourceType } = options;

    const taskId = await scheduleUninstallAllTask({
      taskManager: this.taskManager,
      logger: this.logger,
      inferenceId,
      resourceType,
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
    const taskStatus = await getInstallAllTaskStatus({
      taskManager: this.taskManager,
      inferenceId,
    });
    if (taskStatus === 'pending') {
      return { status: 'installing' };
    }

    const installStatus = await this.docInstallClient.getInstallationStatus({ inferenceId });
    // A failed install task may have failed before writing any product status
    const overallStatus =
      taskStatus === 'failed'
        ? 'error'
        : getOverallStatus(Object.values(installStatus).map((v) => v.status));
    return { status: overallStatus, installStatus };
  }

  async getStatuses({
    inferenceIds,
  }: {
    inferenceIds: string[];
  }): Promise<Record<string, PerformUpdateResponse>> {
    // check status after installation in case of failure
    const statuses = await Promise.allSettled(
      inferenceIds.map((inferenceId) =>
        this.getStatus({
          inferenceId,
        })
      )
    );
    const body = statuses.reduce<Record<string, PerformUpdateResponse>>(
      (acc, installationStatus, index) => {
        const inferenceId = inferenceIds[index];
        // Handle internal server error
        if (installationStatus.status === 'rejected') {
          const failureReason = installationStatus.reason;
          return {
            ...acc,
            [inferenceId]: {
              installed: status === 'uninstalled',
              ...(failureReason ? { failureReason: JSON.stringify(failureReason) } : {}),
            },
          };
        }
        if (installationStatus.status === 'fulfilled') {
          const { status, installStatus } = installationStatus.value;

          let failureReason = null;
          // Check for real reason of previous installation failure
          if (status === 'error' && installStatus) {
            failureReason = Object.values(installStatus)
              .filter(
                (product: ProductInstallState) =>
                  product.status === 'error' && product.failureReason
              )
              .map((product: ProductInstallState) => product.failureReason)
              .join('\n');
          }
          return {
            ...acc,
            [inferenceId]: {
              installed: status === 'installed',
              ...(failureReason ? { failureReason } : {}),
            } as PerformUpdateResponse,
          };
        }
        return acc;
      },
      {}
    );
    return body;
  }

  // Security Labs methods

  async installSecurityLabs(options: SecurityLabsInstallOptions): Promise<void> {
    const { request, inferenceId, version } = options;

    const license = await this.licensing.getLicense();
    if (!checkLicense(license)) {
      throw new Error('Security Labs content requires an enterprise license');
    }

    if (!this.packageInstaller) {
      throw new Error('PackageInstaller not available');
    }

    if (request) {
      this.auditService.asScoped(request).log({
        message:
          `User is requesting installation of Security Labs content for AI Assistants.` +
          (inferenceId ? ` Inference ID=[${inferenceId}]` : '') +
          (version ? ` Version=[${version}]` : ''),
        event: {
          action: 'security_labs_create',
          category: ['database'],
          type: ['creation'],
          outcome: 'unknown',
        },
      });
    }

    await this.runUnderInstallLock(
      { source: 'installSecurityLabs', inferenceId, failure: 'install Security Labs content' },
      (installer) => installer.installSecurityLabs({ version, inferenceId })
    );
  }

  async uninstallSecurityLabs(options: SecurityLabsUninstallOptions): Promise<void> {
    const { request, inferenceId } = options;

    if (!this.packageInstaller) {
      throw new Error('PackageInstaller not available');
    }

    if (request) {
      this.auditService.asScoped(request).log({
        message: `User is requesting deletion of Security Labs content for AI Assistants.`,
        event: {
          action: 'security_labs_delete',
          category: ['database'],
          type: ['deletion'],
          outcome: 'unknown',
        },
      });
    }

    await this.runUnderInstallLock(
      { source: 'uninstallSecurityLabs', inferenceId, failure: 'uninstall Security Labs content' },
      (installer) => installer.uninstallSecurityLabs({ inferenceId })
    );
  }
  async uninstallOpenAPISpec(options: SecurityLabsUninstallOptions): Promise<void> {
    const { request, inferenceId } = options;
    if (!this.packageInstaller) {
      throw new Error('PackageInstaller not available');
    }
    if (request) {
      this.auditService.asScoped(request).log({
        message: `User is requesting deletion of OpenAPI Spec content for AI Assistants.`,
        event: {
          action: 'openapi_spec_delete',
          category: ['database'],
          type: ['deletion'],
          outcome: 'unknown',
        },
      });
    }
    await this.runUnderInstallLock(
      { source: 'uninstallOpenApiSpec', inferenceId, failure: 'uninstall OpenAPI Spec content' },
      (installer) => installer.uninstallOpenAPISpec({ inferenceId })
    );
  }

  async getSecurityLabsStatus({
    inferenceId,
    includeAvailableArtifacts,
  }: {
    inferenceId: string;
    includeAvailableArtifacts?: boolean;
  }): Promise<SecurityLabsStatusResponse> {
    if (!this.packageInstaller) {
      return { status: 'uninstalled' };
    }

    try {
      return await this.packageInstaller.getSecurityLabsStatus({
        inferenceId,
        includeAvailableArtifacts,
      });
    } catch (error) {
      this.logger.error(`Failed to get Security Labs status: ${error.message}`);
      return {
        status: 'error',
        failureReason: error.message,
      };
    }
  }

  // openapi spec methods
  async installOpenApiSpec(options: SecurityLabsInstallOptions): Promise<void> {
    const { request, inferenceId, version } = options;

    const license = await this.licensing.getLicense();
    if (!checkLicense(license)) {
      throw new Error('OpenAPI Spec content requires an enterprise license');
    }

    if (!this.packageInstaller) {
      throw new Error('PackageInstaller not available');
    }

    if (request) {
      this.auditService.asScoped(request).log({
        message:
          `User is requesting installation of OpenAPI Spec content for AI Assistants.` +
          (inferenceId ? ` Inference ID=[${inferenceId}]` : '') +
          (version ? ` Version=[${version}]` : ''),
        event: {
          action: 'openapi_spec_create',
          category: ['database'],
          type: ['creation'],
          outcome: 'unknown',
        },
      });
    }

    await this.runUnderInstallLock(
      { source: 'installOpenApiSpec', inferenceId, failure: 'install OpenAPI Spec content' },
      (installer) => installer.installOpenAPISpec({ version, inferenceId })
    );
  }

  async getOpenApiSpecStatus({
    inferenceId,
  }: {
    inferenceId: string;
  }): Promise<SecurityLabsStatusResponse> {
    if (!this.packageInstaller) {
      return { status: 'uninstalled' };
    }

    try {
      return await this.packageInstaller.getOpenApiSpecStatus({ inferenceId });
    } catch (error) {
      this.logger.error(`Failed to get OpenAPI Spec status: ${error.message}`);
      return {
        status: 'error',
        failureReason: error.message,
      };
    }
  }
}

const getOverallStatus = (statuses: InstallationStatus[]): InstallationStatus => {
  const statusOrder: InstallationStatus[] = [
    'error',
    'installing',
    'uninstalling',
    'uninstalled',
    'installed',
  ];
  for (const status of statusOrder) {
    if (statuses.includes(status)) {
      return status;
    }
  }
  return 'installed';
};
