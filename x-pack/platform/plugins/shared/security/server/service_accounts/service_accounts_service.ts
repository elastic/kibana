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
      // lands; see https://github.com/elastic/kibana/issues/284466.
      workloads: createNotImplementedWorkloadBindings(),
    };
  }
}
