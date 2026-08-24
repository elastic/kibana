/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildFlavor } from '@kbn/config';
import type { KibanaRequest, Logger, SavedObjectsServiceStart } from '@kbn/core/server';
import type { UiamOAuthProjectType } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

import {
  createNotImplementedWorkloadBindings,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
  ServiceAccountWorkloadBindings,
  WorkloadBindingStore,
} from './bindings';
import { EsServiceAccounts } from './es_service_accounts';
import type { ServiceAccountsServiceStart } from './types';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { UiamServicePublic } from '../uiam';

export interface ServiceAccountsServiceStartParams {
  config: ConfigType;
  license: SecurityLicense;
  /** The UIAM service, when UIAM is configured for this deployment. */
  uiam?: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  organizationId?: string;
  projectId?: string;
  projectType?: UiamOAuthProjectType;
  buildFlavor: BuildFlavor;
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
    organizationId,
    projectId,
    projectType,
    buildFlavor,
    savedObjects,
    encryptedSavedObjects,
    canEncrypt,
    getCurrentUser,
    getCurrentProfileId,
    getSpaceId,
  }: ServiceAccountsServiceStartParams): ServiceAccountsServiceStart | null {
    if (config.serviceAccounts?.enabled !== true) {
      this.logger.debug('Service accounts are not enabled.');
      return null;
    }

    // UIAM backs serverless projects; Elasticsearch service accounts are the story everywhere
    // else (see https://github.com/elastic/kibana/issues/284464). Note that the
    // `serviceAccounts` setting is currently serverless-only, so the Elasticsearch branch is
    // reached by tests and by a misconfigured serverless project rather than by a stateful
    // deployment — it becomes the real path once the setting is offered off-serverless too.
    const esBackend = () =>
      Object.assign(new EsServiceAccounts(), {
        workloads: createNotImplementedWorkloadBindings(),
      });

    if (buildFlavor !== 'serverless') {
      this.logger.debug('Selecting the Elasticsearch service accounts backend.');
      return esBackend();
    }

    if (!uiam || !organizationId || !projectId || !projectType) {
      throw new Error(
        `Cannot start service accounts: missing one or more required parameters: ${JSON.stringify({
          organizationId,
          projectId,
          projectType,
          uiam: uiam ? 'true' : 'false',
        })}`
      );
    }

    const backend = new UiamServiceAccounts({
      logger: this.logger,
      license,
      uiam,
      checkPrivilegesWithRequest,
      organizationId,
      projectId,
      projectType,
    });

    const store = new WorkloadBindingStore({
      client: savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
      }),
      encryptedClient: encryptedSavedObjects.getClient({
        includedHiddenTypes: [SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE],
      }),
      isEncryptionError: encryptedSavedObjects.isEncryptionError,
      logger: this.logger.get('workload-bindings'),
    });

    // `Object.assign` rather than a spread: the backend's methods live on its prototype, which a
    // spread would silently drop.
    return Object.assign(backend, {
      workloads: new ServiceAccountWorkloadBindings({
        logger: this.logger.get('workload-bindings'),
        license,
        store,
        backend,
        checkPrivilegesWithRequest,
        getCurrentUser,
        getCurrentProfileId,
        getSpaceId,
        canEncrypt,
      }),
    });
  }
}
