/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { randomBytes } from 'crypto';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  BindServiceAccountWorkloadParams,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
  ServiceAccountWorkloadRef,
  ServiceAccountWorkloadRequestParams,
} from '@kbn/core-security-server';
import type {
  AuditServiceSetup,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import type { WorkloadBindingCoordinates } from './binding_saved_object';
import { bestEffortUserProfileIdResolver, resolveWorkloadBinder } from './resolve_workload_binder';
import type { WorkloadBindingStore } from './workload_binding_store';
import type { AuthenticatedUser, SecurityLicense } from '../../../common';
import type { ServiceAccountAuditEventParams } from '../../audit';
import { ServiceAccountAuditAction, serviceAccountAuditEvent } from '../../audit';
import { getDetailedErrorMessage } from '../../errors';
import type { EnsureClusterPrivilegeParams } from '../cluster_privilege';
import { ensureClusterPrivilege } from '../cluster_privilege';
import type { ServiceAccountsBackend } from '../types';

/**
 * Size of a binding's canary. Only needs to be unguessable — it is never read for its content,
 * and exists so that every other attribute is covered by an authentication tag.
 */
const CANARY_BYTE_LENGTH = 32;

/**
 * Manages and executes workload bindings, one plugin per call. The plugin id is supplied by Core
 * from the calling plugin's context, never by the plugin itself, so a plugin can never address
 * another's bindings.
 */
export interface ServiceAccountWorkloadBindingsApi {
  bindWorkload(
    pluginId: string,
    request: KibanaRequest,
    params: BindServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  unbindWorkload(
    pluginId: string,
    request: KibanaRequest,
    params: ServiceAccountWorkloadRef
  ): Promise<boolean>;

  getBinding(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  withScopedRequest<T>(
    pluginId: string,
    params: ServiceAccountWorkloadRequestParams,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}

export interface ServiceAccountWorkloadBindingsOptions {
  logger: Logger;
  license: SecurityLicense;
  store: WorkloadBindingStore;
  backend: ServiceAccountsBackend;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  audit: AuditServiceSetup;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  /**
   * Resolves the user profile behind a request, including the creator of an API key. Used to keep
   * bindings traceable to a person; failures are tolerated rather than failing the bind.
   */
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
  /**
   * Resolves the space a request is acting in.
   */
  getSpaceId: (request: KibanaRequest) => string;
  /** Whether saved object encryption is possible at all; without it, bindings cannot be trusted. */
  canEncrypt: boolean;
}

export class ServiceAccountWorkloadBindings implements ServiceAccountWorkloadBindingsApi {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly store: WorkloadBindingStore;
  private readonly backend: ServiceAccountsBackend;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly audit: AuditServiceSetup;
  private readonly getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  private readonly getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
  private readonly getSpaceId: (request: KibanaRequest) => string;
  private readonly canEncrypt: boolean;

  constructor({
    logger,
    license,
    store,
    backend,
    checkPrivilegesWithRequest,
    audit,
    getCurrentUser,
    getCurrentUserProfileId,
    getSpaceId,
    canEncrypt,
  }: ServiceAccountWorkloadBindingsOptions) {
    this.logger = logger;
    this.license = license;
    this.store = store;
    this.backend = backend;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.audit = audit;
    this.getCurrentUser = getCurrentUser;
    this.getCurrentUserProfileId = getCurrentUserProfileId;
    this.getSpaceId = getSpaceId;
    this.canEncrypt = canEncrypt;
  }

  async bindWorkload(
    pluginId: string,
    request: KibanaRequest,
    { serviceAccountId, workloadType, workloadId }: BindServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding> {
    this.ensureAvailable();

    const user = this.getCurrentUser(request);
    if (!user) {
      throw Boom.unauthorized(
        'Cannot bind a service account to a workload: the request is not authenticated'
      );
    }

    const bindingAudit = this.bindingAudit(request, {
      plugin_id: pluginId,
      type: workloadType,
      id: workloadId,
    });
    await this.ensureCanManage(
      request,
      'bind a service account to a workload',
      bindingAudit.refused(ServiceAccountAuditAction.WORKLOAD_BIND, serviceAccountId)
    );

    const spaceId = this.getSpaceId(request);

    // A rebind takes the workload away from one account and gives it to another. Both ends are
    // audited, so that a search on either account finds the change.
    const previousServiceAccountId = await this.readBoundServiceAccountId({
      pluginId,
      workloadType,
      workloadId,
      spaceId,
    });
    if (previousServiceAccountId !== undefined && previousServiceAccountId !== serviceAccountId) {
      bindingAudit.intent(ServiceAccountAuditAction.WORKLOAD_UNBIND, previousServiceAccountId);
    }
    bindingAudit.intent(ServiceAccountAuditAction.WORKLOAD_BIND, serviceAccountId);

    const binding = await this.store.set({
      pluginId,
      workloadType,
      workloadId,
      serviceAccountId,
      spaceId,
      boundBy: await resolveWorkloadBinder(
        user,
        bestEffortUserProfileIdResolver(this.getCurrentUserProfileId, request, this.logger)
      ),
      boundAt: new Date().toISOString(),
      // Fresh per bind, so no two generations of a binding share one. This does not make a
      // rebind irreversible; see the attribute's own note.
      canary: randomBytes(CANARY_BYTE_LENGTH).toString('base64'),
    });

    this.logger.debug(
      `Bound a service account to workload [${workloadType}/${workloadId}] of plugin [${pluginId}]`
    );

    return binding;
  }

  async unbindWorkload(
    pluginId: string,
    request: KibanaRequest,
    { workloadType, workloadId }: ServiceAccountWorkloadRef
  ): Promise<boolean> {
    this.ensureAvailable();

    // Same gate as bindWorkload: unbinding a workload silently drops it to no identity at all, which is
    // as much a privileged change as granting one.
    const bindingAudit = this.bindingAudit(request, {
      plugin_id: pluginId,
      type: workloadType,
      id: workloadId,
    });
    await this.ensureCanManage(
      request,
      'unbind a service account from a workload',
      bindingAudit.refused(ServiceAccountAuditAction.WORKLOAD_UNBIND)
    );

    const spaceId = this.getSpaceId(request);
    const coordinates = { pluginId, workloadType, workloadId, spaceId };

    // The delete addresses the binding by its coordinates, so the account it takes the workload
    // from is read first, verified, for the event. Absent when there is no binding to remove or
    // the stored one cannot be trusted.
    bindingAudit.intent(
      ServiceAccountAuditAction.WORKLOAD_UNBIND,
      await this.readBoundServiceAccountId(coordinates)
    );

    const deleted = await this.store.delete(coordinates);

    if (deleted) {
      this.logger.debug(
        `Unbound the service account from workload [${workloadType}/${workloadId}] of plugin [${pluginId}] in space [${spaceId}]`
      );
    } else {
      // Worth a warning rather than silence: a plugin deleting a workload from the wrong space would
      // otherwise leave a binding behind with nothing to show for it.
      this.logger.warn(
        `Unbinding matched no binding for workload [${workloadType}/${workloadId}] of plugin [${pluginId}] in space [${spaceId}]`
      );
    }

    return deleted;
  }

  async getBinding(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null> {
    this.ensureAvailable();
    return await this.store.getVerified(this.toCoordinates(pluginId, params));
  }

  async withScopedRequest<T>(
    pluginId: string,
    params: ServiceAccountWorkloadRequestParams,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T> {
    this.ensureAvailable();

    const coordinates = this.toCoordinates(pluginId, params);
    const binding = await this.requireBinding(coordinates);
    if (
      params.expectedServiceAccountId !== undefined &&
      binding.serviceAccountId !== params.expectedServiceAccountId
    ) {
      throw Boom.forbidden('The workload binding does not match the expected service account.');
    }
    let minted = false;

    const request = await this.backend.createFakeRequest({
      serviceAccountId: binding.serviceAccountId,
      spaceId: coordinates.spaceId,
      boundAt: binding.boundAt,
      // No time-based lease: the binding check below runs before every re-mint, which is both
      // stricter and revocable — unbinding the workload denies a running execution its next
      // credential rather than waiting for a lease to lapse.
      maxLifetimeMs: Number.POSITIVE_INFINITY,
      // Runs for the initial mint and again for every reactive re-mint driven by an
      // Elasticsearch 401. That reactive path lives in the Elasticsearch client's unauthorized
      // error handler, far outside this call stack, so this interceptor is the only place a
      // binding check can reach it. The initial mint follows the verification just above
      // immediately, and is let through on its strength rather than paying for the read twice.
      mintInterceptor: async (mint) => {
        if (!minted) {
          minted = true;
          return await mint();
        }

        try {
          const current = await this.requireBinding(coordinates);
          if (current.serviceAccountId !== binding.serviceAccountId) {
            throw Boom.forbidden(
              'The workload was bound to a different service account; refusing to mint a credential for the previous one.'
            );
          }
        } catch (e) {
          // The registry logs refresh failures without their contents, since those can carry
          // upstream credentials. Binding checks never do, and the reason is exactly what an
          // operator needs to tell a revocation from an outage.
          this.logger.warn(
            `Refusing to re-mint a credential for workload [${coordinates.workloadType}/${
              coordinates.workloadId
            }] of plugin [${coordinates.pluginId}]: ${getDetailedErrorMessage(e)}`
          );
          throw e;
        }

        return await mint();
      },
    });

    try {
      return await fn(request);
    } finally {
      // Ends the credential's life with the execution: a request that outlives its bracket (kept
      // on a singleton, captured in a closure) is never re-credentialed and expires for good.
      this.backend.releaseFakeRequest(request);
    }
  }

  /**
   * The account a workload is currently bound to, for naming in the audit event of a change that
   * is about to replace or remove the binding. Only a verified binding is named: a stored document
   * that fails integrity verification is already refused and logged by the store, and the change
   * proceeds without a target rather than copying an untrusted id into the log. Any other failure
   * to read is one the write that follows would share, and propagates.
   */
  private async readBoundServiceAccountId(
    coordinates: WorkloadBindingCoordinates
  ): Promise<string | undefined> {
    try {
      return (await this.store.getVerified(coordinates))?.serviceAccountId;
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 403) {
        return undefined;
      }
      throw e;
    }
  }

  private async requireBinding(
    coordinates: WorkloadBindingCoordinates
  ): Promise<ServiceAccountWorkloadBinding> {
    const binding = await this.store.getVerified(coordinates);

    if (!binding) {
      throw Boom.notFound(
        `No service account is bound to workload [${coordinates.workloadType}/${coordinates.workloadId}] of plugin [${coordinates.pluginId}].`
      );
    }

    return binding;
  }

  /**
   * The audit events of a binding change, logged on the request making it. Binding changes follow
   * the convention for writes: `intent` is logged once the change is authorized and before it is
   * written, and is not awaited, so it records the attempt rather than the result. `refused` is
   * the failed attempt when the request may not manage bindings.
   */
  private bindingAudit(
    request: KibanaRequest,
    workload: NonNullable<ServiceAccountAuditEventParams['workload']>
  ) {
    const auditLogger = this.audit.asScoped(request);
    const log = (
      action: ServiceAccountAuditAction,
      serviceAccountId: string | undefined,
      result: { outcome: 'unknown' } | { error: Error }
    ) =>
      auditLogger.log(
        serviceAccountAuditEvent({
          action,
          ...(serviceAccountId !== undefined ? { serviceAccount: { id: serviceAccountId } } : {}),
          workload,
          ...result,
        })
      );

    return {
      intent: (action: ServiceAccountAuditAction, serviceAccountId?: string) =>
        log(action, serviceAccountId, { outcome: 'unknown' }),
      refused: (action: ServiceAccountAuditAction, serviceAccountId?: string) => (error: Error) =>
        log(action, serviceAccountId, { error }),
    };
  }

  /**
   * Refuses with a 403 unless the request may manage bindings, calling `onRefused` first. Other
   * errors from the check (an unavailable cluster, say) say nothing about authorization, and do
   * not call it.
   */
  private ensureCanManage(
    request: KibanaRequest,
    action: string,
    onRefused: EnsureClusterPrivilegeParams['onRefused']
  ): Promise<void> {
    return ensureClusterPrivilege({
      privilege: 'manage_security',
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      action,
      onRefused,
    });
  }

  // Picks the coordinates out explicitly, so a caller's extra fields never reach the store.
  private toCoordinates(
    pluginId: string,
    { workloadType, workloadId, spaceId }: ServiceAccountWorkloadCoordinates
  ): WorkloadBindingCoordinates {
    return { pluginId, workloadType, workloadId, spaceId };
  }

  private ensureAvailable(): void {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot use service account workload bindings: security features are disabled in Elasticsearch'
      );
    }

    // Without an encryption key a binding could be written, but nothing would stand behind which
    // service account it names. Refuse rather than persist an unverifiable one.
    if (!this.canEncrypt) {
      throw Boom.forbidden(
        'Cannot use service account workload bindings: saved object encryption is not available. Set `xpack.encryptedSavedObjects.encryptionKey`.'
      );
    }
  }
}
