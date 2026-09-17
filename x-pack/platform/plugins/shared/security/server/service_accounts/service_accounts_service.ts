/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  IClusterClient,
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
import { SERVICE_ACCOUNT_CREDENTIAL_TYPE, ServiceAccountCredentialStore } from './credentials';
import { EsServiceAccounts } from './es_service_accounts';
import type { CloudProjectContext, ServiceAccountsServiceStart } from './types';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { UiamServicePublic } from '../uiam';

export interface ServiceAccountsServiceStartParams {
  config: ConfigType;
  /** Whether this is a serverless deployment, which is what selects the backend. */
  isServerless: boolean;
  license: SecurityLicense;
  /** The UIAM service, when UIAM is configured for this deployment. */
  uiam?: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  cloudProjectContext?: CloudProjectContext;
  clusterClient: IClusterClient;
  savedObjects: SavedObjectsServiceStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  /** Whether saved object encryption is possible, captured from the encrypted saved objects setup contract. */
  canEncrypt: boolean;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
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
    isServerless,
    license,
    uiam,
    checkPrivilegesWithRequest,
    cloudProjectContext,
    clusterClient,
    savedObjects,
    encryptedSavedObjects,
    canEncrypt,
    getCurrentUser,
    getCurrentUserProfileId,
    getSpaceId,
  }: ServiceAccountsServiceStartParams): ServiceAccountsServiceStart | null {
    if (!config.serviceAccounts.enabled) {
      this.logger.debug('Service accounts are not enabled.');
      return null;
    }

    // UIAM and Elasticsearch are mutually exclusive, and the offering decides which one runs:
    // serverless runs UIAM, every other offering runs Elasticsearch's user-managed service
    // accounts. Deliberately not keyed off UIAM availability. A serverless deployment whose
    // UIAM configuration is incomplete has to report the feature as unavailable, rather than
    // fall through to creating Elasticsearch accounts the control plane knows nothing about.
    if (isServerless) {
      if (!uiam || !cloudProjectContext) {
        this.logger.error(
          'Service accounts are enabled but UIAM is not available, so they cannot be offered on ' +
            'this deployment. Elasticsearch-backed service accounts are not supported on serverless.'
        );
        return null;
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
          getCurrentUserProfileId,
          getSpaceId,
          canEncrypt,
        }),
      };
    }

    this.logger.debug('Using the Elasticsearch service accounts backend.');
    return {
      backend: new EsServiceAccounts({
        logger: this.logger.get('elasticsearch'),
        license,
        clusterClient,
        checkPrivilegesWithRequest,
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
      }),
      // Workload binding is a UIAM-only capability until the Elasticsearch token exchange
      // lands; see https://github.com/elastic/kibana/issues/284465.
      workloads: createNotImplementedWorkloadBindings(),
    };
  }
}
