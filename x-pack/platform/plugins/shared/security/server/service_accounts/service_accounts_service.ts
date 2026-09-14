/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

import {
  createNotImplementedWorkloadBindings,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
  ServiceAccountWorkloadBindings,
  WorkloadBindingStore,
} from './bindings';
import { EsServiceAccounts } from './es_service_accounts';
import type { CloudProjectContext, ServiceAccountsServiceStart } from './types';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { UiamServicePublic } from '../uiam';

export interface ServiceAccountsServiceStartParams {
  config: ConfigType;
  license: SecurityLicense;
  /** The UIAM service, when UIAM is configured for this deployment. */
  uiam?: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  cloudProjectContext?: CloudProjectContext;
  savedObjects: SavedObjectsServiceStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  /** Whether saved object encryption is possible, captured from the encrypted saved objects setup contract. */
  canEncrypt: boolean;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getCurrentProfileId: (request: KibanaRequest) => Promise<string | null>;
  getSpaceId: (request: KibanaRequest) => string;
}

export class ServiceAccountsService {
  constructor(private readonly logger: Logger) {}

  /**
   * Returns the service account management API, or `null` when service accounts
   * are not enabled for this deployment.
   */
  start({
    config,
    license,
    uiam,
    checkPrivilegesWithRequest,
    cloudProjectContext,
    savedObjects,
    encryptedSavedObjects,
    canEncrypt,
    getCurrentUser,
    getCurrentProfileId,
    getSpaceId,
  }: ServiceAccountsServiceStartParams): ServiceAccountsServiceStart | null {
    if (!config.serviceAccounts?.enabled) {
      this.logger.debug('Service accounts are not enabled.');
      return null;
    }

    // Backend selection keys off UIAM availability rather than the build flavor, so
    // that the Elasticsearch path is reachable and testable before it is finished.
    if (!uiam || !cloudProjectContext) {
      this.logger.debug(
        'UIAM is not available; falling back to the Elasticsearch service accounts backend.'
      );
      return {
        backend: new EsServiceAccounts(),
        workloads: createNotImplementedWorkloadBindings(),
      };
    }

    const backend = new UiamServiceAccounts({
      logger: this.logger,
      requestLifetimeMs: config.serviceAccounts.requestLifetime.asMilliseconds(),
      license,
      uiam,
      checkPrivilegesWithRequest,
      cloudProjectContext,
      getCurrentUser,
    });

    const bindingsLogger = this.logger.get('workload-bindings');
    const store = new WorkloadBindingStore({
      client: savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
      }),
      encryptedClient: encryptedSavedObjects.getClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
      }),
      isEncryptionError: encryptedSavedObjects.isEncryptionError,
      logger: bindingsLogger,
    });

    return {
      backend,
      workloads: new ServiceAccountWorkloadBindings({
        logger: bindingsLogger,
        license,
        store,
        backend,
        checkPrivilegesWithRequest,
        getCurrentUser,
        getCurrentProfileId,
        getSpaceId,
        canEncrypt,
      }),
    };
  }
}
