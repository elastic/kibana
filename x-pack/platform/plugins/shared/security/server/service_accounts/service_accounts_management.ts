/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import type {
  AuditServiceSetup,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import type { WorkloadBindingStore } from './bindings';
import type { EnsureClusterPrivilegeParams } from './cluster_privilege';
import { ensureClusterPrivilege } from './cluster_privilege';
import type { ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import type { ServiceAccountBoundWorkload } from '../../common/service_accounts';
import { ServiceAccountAuditAction, serviceAccountAuditEvent } from '../audit';

/** How many bindings are re-read at once when checking whether an account can be deleted. */
const VERIFY_CONCURRENCY = 10;

/**
 * What came of a delete. An account that is still bound to workloads is not deleted unless the
 * caller forces it, and the workloads that stopped it are reported back.
 */
export type DeleteServiceAccountResult =
  | { deleted: true; warnings: string[] }
  | { deleted: false; workloads: [ServiceAccountBoundWorkload, ...ServiceAccountBoundWorkload[]] };

const isNonEmpty = <T>(items: T[]): items is [T, ...T[]] => items.length > 0;

export interface DeleteServiceAccountOptions {
  /**
   * Deletes the account even when workloads are still bound to it. Those workloads then fail at
   * their next token exchange until someone unbinds them.
   */
  force: boolean;
}

/**
 * Management operations that span a service account and the workloads bound to it, for the
 * management routes. Unlike the workload bindings API, nothing here is scoped to one plugin.
 */
export interface ServiceAccountsManagementApi {
  /**
   * Lists every workload bound to the account, across plugins and spaces, the same way a delete
   * checks for them. Requires `manage_security`.
   */
  listWorkloads(
    request: KibanaRequest,
    serviceAccountId: string
  ): Promise<ServiceAccountBoundWorkload[]>;

  /** Deletes the account, unless workloads are still bound to it and `force` is not set. */
  delete(
    request: KibanaRequest,
    serviceAccountId: string,
    options: DeleteServiceAccountOptions
  ): Promise<DeleteServiceAccountResult>;
}

export interface ServiceAccountsManagementOptions {
  logger: Logger;
  license: SecurityLicense;
  backend: ServiceAccountsBackend;
  store: WorkloadBindingStore;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  audit: AuditServiceSetup;
}

const toBoundWorkload = ({
  pluginId,
  workloadType,
  workloadId,
}: ServiceAccountWorkloadBinding): ServiceAccountBoundWorkload => ({
  pluginId,
  workloadType,
  workloadId,
  displayName: workloadId,
});

export class ServiceAccountsManagement implements ServiceAccountsManagementApi {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly backend: ServiceAccountsBackend;
  private readonly store: WorkloadBindingStore;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly audit: AuditServiceSetup;

  constructor({
    logger,
    license,
    backend,
    store,
    checkPrivilegesWithRequest,
    audit,
  }: ServiceAccountsManagementOptions) {
    this.logger = logger;
    this.license = license;
    this.backend = backend;
    this.store = store;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.audit = audit;
  }

  async listWorkloads(
    request: KibanaRequest,
    serviceAccountId: string
  ): Promise<ServiceAccountBoundWorkload[]> {
    await this.authorize(request, 'list the workloads of a service account');

    return await this.findBoundWorkloads(serviceAccountId);
  }

  async delete(
    request: KibanaRequest,
    serviceAccountId: string,
    { force }: DeleteServiceAccountOptions
  ): Promise<DeleteServiceAccountResult> {
    const auditLogger = this.audit.asScoped(request);
    const auditDelete = (params: { outcome?: 'unknown'; error?: Error }) =>
      auditLogger.log(
        serviceAccountAuditEvent({
          action: ServiceAccountAuditAction.DELETE,
          serviceAccount: { id: serviceAccountId },
          force,
          ...params,
        })
      );

    // The backend checks this privilege too. Checking it here first means a caller who may not
    // delete the account never learns what it is bound to, and every refusal, forced or not, is
    // audited in one place.
    await this.authorize(request, 'delete a service account', (error) => auditDelete({ error }));

    if (!force) {
      const workloads = await this.findBoundWorkloads(serviceAccountId);
      if (isNonEmpty(workloads)) {
        this.logger.debug(
          `Refused to delete service account [${serviceAccountId}]: it is still bound to ${workloads.length} workloads`
        );
        return { deleted: false, workloads };
      }
    }

    // Logged once authorized and issued before the delete, so it records the attempt rather than
    // the result: a refusal the backend makes after this, or a delete that fails, adds nothing.
    auditDelete({ outcome: 'unknown' });

    const { warnings } = await this.backend.delete(request, serviceAccountId);
    return { deleted: true, warnings };
  }

  /**
   * The workloads still bound to the account. The search behind this is not integrity-verified,
   * so each binding it finds is read again through `getVerified` before it counts.
   *
   * A binding that is gone or bound to another account by then no longer counts. A binding that
   * fails verification still does: it cannot be trusted to say which account it names, and the
   * safe answer to "would deleting this account break it?" is yes.
   */
  private async findBoundWorkloads(
    serviceAccountId: string
  ): Promise<ServiceAccountBoundWorkload[]> {
    const candidates = await this.store.findByServiceAccountId(serviceAccountId);

    const blocking = await pMap(
      candidates,
      async (candidate) => {
        const { pluginId, workloadType, workloadId, spaceId } = candidate;
        try {
          const binding = await this.store.getVerified({
            pluginId,
            workloadType,
            workloadId,
            spaceId,
          });
          return binding?.serviceAccountId === serviceAccountId ? toBoundWorkload(binding) : null;
        } catch (e) {
          if (Boom.isBoom(e) && e.output.statusCode === 403) {
            return toBoundWorkload(candidate);
          }
          throw e;
        }
      },
      { concurrency: VERIFY_CONCURRENCY }
    );

    return blocking.filter(
      (workload): workload is ServiceAccountBoundWorkload => workload !== null
    );
  }

  private async authorize(
    request: KibanaRequest,
    action: string,
    onRefused?: EnsureClusterPrivilegeParams['onRefused']
  ): Promise<void> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(`Cannot ${action}: security features are disabled in Elasticsearch`);
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'manage_security',
      action,
      onRefused,
    });
  }
}
