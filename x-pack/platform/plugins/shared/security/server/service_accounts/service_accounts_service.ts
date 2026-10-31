/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';

import type {
  AuthenticatedUser,
  IClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { CoreSecurityDelegateServiceAccounts } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  AuditServiceSetup,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import {
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
  ServiceAccountWorkloadBindings,
  StaleBindingCleanupTask,
  StaleBindingReaper,
  WorkloadBindingStore,
} from './bindings';
import { SERVICE_ACCOUNT_CREDENTIAL_TYPE, ServiceAccountCredentialStore } from './credentials';
import { EsServiceAccounts } from './es_service_accounts';
import { ServiceAccountsManagement } from './service_accounts_management';
import type {
  CloudProjectContext,
  ServiceAccountsBackend,
  ServiceAccountsServiceStart,
} from './types';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import type { UiamServicePublic } from '../uiam';

export interface ServiceAccountsServiceStartParams {
  config: ConfigType;
  /** Whether this is a serverless deployment, which is what selects the backend. */
  isServerless: boolean;
  license: SecurityLicense;
  /** The UIAM service, when UIAM is configured for this deployment. */
  uiam?: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  audit: AuditServiceSetup;
  cloudProjectContext?: CloudProjectContext;
  clusterClient: IClusterClient;
  savedObjects: SavedObjectsServiceStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  /** Whether saved object encryption is possible, captured from the encrypted saved objects setup contract. */
  canEncrypt: boolean;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
  getSpaceId: (request: KibanaRequest) => string;
  /** What Core knows about the workload types plugins register. */
  workloadTypes: CoreSecurityDelegateServiceAccounts;
  taskManager: TaskManagerStartContract;
  /** Emits whenever Elasticsearch becomes available, which is when the cleanup task is scheduled. */
  online$: Observable<OnlineStatusRetryScheduler>;
}

export class ServiceAccountsService {
  private readonly cleanupTask: StaleBindingCleanupTask;

  constructor(private readonly logger: Logger) {
    this.cleanupTask = new StaleBindingCleanupTask(this.logger.get('binding-cleanup'));
  }

  setup({ taskManager }: { taskManager: TaskManagerSetupContract }): void {
    this.cleanupTask.setup({ taskManager });
  }

  stop(): void {
    this.cleanupTask.stop();
  }

  /**
   * Returns the service account management API, or `null` when service accounts
   * are not enabled for this deployment.
   */
  start({
    config,
    isServerless,
    license,
    uiam,
    checkPrivilegesWithRequest,
    audit,
    cloudProjectContext,
    clusterClient,
    savedObjects,
    encryptedSavedObjects,
    canEncrypt,
    getCurrentUser,
    getCurrentUserProfileId,
    getSpaceId,
    workloadTypes,
    taskManager,
    online$,
  }: ServiceAccountsServiceStartParams): ServiceAccountsServiceStart | null {
    const { bindingCleanup } = config.serviceAccounts;
    const startCleanupTask = (reaper?: StaleBindingReaper) =>
      this.cleanupTask.start({
        taskManager,
        reaper,
        isAvailable: () => license.isEnabled() && canEncrypt,
        interval: `${bindingCleanup.interval.asSeconds()}s`,
        online$,
      });

    if (!config.serviceAccounts.enabled) {
      this.logger.debug('Service accounts are not enabled.');
      startCleanupTask();
      return null;
    }

    let backend: ServiceAccountsBackend;
    if (isServerless) {
      // `SecurityPlugin#setup` rejects a serverless deployment without `uiam.enabled`, and the
      // service is only ever constructed from that same config, so this is unreachable in
      // practice. It stays as a guard because the parameter is optional, and the alternative is
      // a non-null assertion further down.
      if (!uiam) {
        this.logger.error(
          'Service accounts are enabled but the UIAM service was never constructed, so they ' +
            'cannot be offered on this deployment.'
        );
        return null;
      }

      // Reachable, unlike the guard above: the project context comes from the `cloud` plugin at
      // setup time, which the config-level check in `SecurityPlugin#setup` cannot speak for. Any
      // of the organization, the project or the project type being absent lands here.
      if (!cloudProjectContext) {
        this.logger.error(
          'Service accounts are enabled but the cloud project context is missing, so they ' +
            'cannot be offered on this deployment.'
        );
        return null;
      }

      backend = new UiamServiceAccounts({
        logger: this.logger,
        requestLifetimeMs: config.serviceAccounts.requestLifetime.asMilliseconds(),
        license,
        uiam,
        checkPrivilegesWithRequest,
        audit,
        cloudProjectContext,
        getCurrentUser,
      });
    } else {
      this.logger.debug('Using the Elasticsearch service accounts backend.');
      backend = new EsServiceAccounts({
        logger: this.logger,
        requestLifetimeMs: config.serviceAccounts.requestLifetime.asMilliseconds(),
        license,
        clusterClient,
        checkPrivilegesWithRequest,
        audit,
        credentialStore: new ServiceAccountCredentialStore({
          client: savedObjects.getUnsafeInternalClient({
            includedHiddenTypes: [SERVICE_ACCOUNT_CREDENTIAL_TYPE],
          }),
          encryptedClient: encryptedSavedObjects.getClient({
            includedHiddenTypes: [SERVICE_ACCOUNT_CREDENTIAL_TYPE],
          }),
          isEncryptionError: encryptedSavedObjects.isEncryptionError,
          logger: this.logger.get('credentials'),
        }),
        canEncrypt,
        getCurrentUser,
        getCurrentUserProfileId,
      });
    }

    const bindingsLogger = this.logger.get('workload-bindings');
    const store = new WorkloadBindingStore({
      client: savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
        // The binding store supplies the namespace explicitly on every operation.
        excludedExtensions: [SPACES_EXTENSION_ID],
      }),
      encryptedClient: encryptedSavedObjects.getClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
      }),
      isEncryptionError: encryptedSavedObjects.isEncryptionError,
      logger: bindingsLogger,
    });

    startCleanupTask(
      new StaleBindingReaper({
        logger: this.logger.get('binding-cleanup'),
        store,
        backend,
        workloadTypes,
        audit,
        gracePeriodMs: bindingCleanup.gracePeriod.asMilliseconds(),
        unregisteredTypeGracePeriodMs: bindingCleanup.unregisteredTypeGracePeriod.asMilliseconds(),
        dryRun: bindingCleanup.dryRun,
      })
    );

    return {
      backend,
      management: new ServiceAccountsManagement({
        logger: this.logger.get('management'),
        license,
        backend,
        store,
        checkPrivilegesWithRequest,
        audit,
        workloadTypes,
      }),
      workloads: new ServiceAccountWorkloadBindings({
        logger: bindingsLogger,
        license,
        store,
        backend,
        checkPrivilegesWithRequest,
        audit,
        getCurrentUser,
        getCurrentUserProfileId,
        getSpaceId,
        canEncrypt,
      }),
    };
  }
}
