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
  AuditLogger,
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
import type { ServiceAccountMintInterceptor } from '../fake_requests';
import { isTerminalMintFailure } from '../fake_requests';
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

/** The `service_account_assume` events of one workload execution. */
interface ExecutionAudit {
  /** Refused before the fake request exists. The account is omitted when it cannot be trusted. */
  failed(error: Error, serviceAccountId?: string): void;
  /** The fake request exists, and the workload is about to run on it. */
  started(request: KibanaRequest, serviceAccountId: string): void;
  /** A re-mint failed for good while the workload ran, so it has no credential left. */
  revoked(request: KibanaRequest, serviceAccountId: string, error: Error): void;
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
    const executionAudit = this.executionAudit(coordinates, params.executionId);

    const binding = await this.resolveExecutionBinding(
      coordinates,
      params.expectedServiceAccountId,
      executionAudit
    );
    const request = await this.createExecutionRequest(coordinates, binding, executionAudit);
    executionAudit.started(request, binding.serviceAccountId);

    try {
      return await fn(request);
    } finally {
      // Ends the credential's life with the execution: a request that outlives its bracket (kept
      // on a singleton, captured in a closure) is never re-credentialed and expires for good.
      this.backend.releaseFakeRequest(request);
    }
  }

  /**
   * The `service_account_assume` events of one workload execution. Until the fake request exists,
   * a failure is logged without one, so the event carries the space itself. Once it exists, events
   * are logged on it, and share its `trace.id` with every event the workload causes. Every event
   * names the run by `executionId` when the caller supplied one.
   */
  private executionAudit(
    coordinates: WorkloadBindingCoordinates,
    executionId: string | undefined
  ): ExecutionAudit {
    const workload = {
      plugin_id: coordinates.pluginId,
      type: coordinates.workloadType,
      id: coordinates.workloadId,
      ...(executionId !== undefined ? { execution_id: executionId } : {}),
    };
    const log = (
      auditLogger: AuditLogger,
      serviceAccountId: string | undefined,
      details: { error?: Error; spaceId?: string } = {}
    ) =>
      auditLogger.log(
        serviceAccountAuditEvent({
          action: ServiceAccountAuditAction.ASSUME,
          ...(serviceAccountId !== undefined ? { serviceAccount: { id: serviceAccountId } } : {}),
          workload,
          ...details,
        })
      );

    return {
      failed: (error, serviceAccountId) =>
        log(this.audit.withoutRequest, serviceAccountId, { error, spaceId: coordinates.spaceId }),
      started: (request, serviceAccountId) => log(this.audit.asScoped(request), serviceAccountId),
      revoked: (request, serviceAccountId, error) =>
        log(this.audit.asScoped(request), serviceAccountId, { error }),
    };
  }

  /**
   * The verified binding a workload executes under. A binding that fails integrity verification,
   * or names a different account than the caller expected, is refused and audited. A workload with
   * no binding has nothing to assume, so its 404 is not.
   */
  private async resolveExecutionBinding(
    coordinates: WorkloadBindingCoordinates,
    expectedServiceAccountId: string | undefined,
    executionAudit: ExecutionAudit
  ): Promise<ServiceAccountWorkloadBinding> {
    const binding = await this.requireBinding(coordinates).catch((e) => {
      // The event names no account: the id in a tampered binding is the one thing it must not
      // repeat.
      if (Boom.isBoom(e) && e.output.statusCode === 403) {
        executionAudit.failed(e);
      }
      throw e;
    });

    if (
      expectedServiceAccountId !== undefined &&
      binding.serviceAccountId !== expectedServiceAccountId
    ) {
      const error = Boom.forbidden(
        'The workload binding does not match the expected service account.'
      );
      executionAudit.failed(error, binding.serviceAccountId);
      throw error;
    }

    return binding;
  }

  /**
   * Mints the fake request a workload executes with. There is no time-based lease: the binding is
   * checked again before every re-mint (see {@link rebindCheck}), which is both stricter and
   * revocable. Unbinding the workload denies a running execution its next credential rather than
   * waiting for a lease to lapse.
   *
   * A failure is audited by the same rule here as on a re-mint: only when it is terminal. A
   * retryable one is an outage, not a decision about the account, and is left to the server log.
   */
  private async createExecutionRequest(
    coordinates: WorkloadBindingCoordinates,
    { serviceAccountId, boundAt }: ServiceAccountWorkloadBinding,
    executionAudit: ExecutionAudit
  ): Promise<KibanaRequest> {
    // Set once the first mint returns. A failure before then fails `createFakeRequest`, and is
    // audited by the catch below instead.
    const execution: { request?: KibanaRequest } = {};

    try {
      const request = await this.backend.createFakeRequest({
        serviceAccountId,
        spaceId: coordinates.spaceId,
        boundAt,
        maxLifetimeMs: Number.POSITIVE_INFINITY,
        mintInterceptor: this.rebindCheck(coordinates, serviceAccountId, (error) => {
          if (execution.request) {
            executionAudit.revoked(execution.request, serviceAccountId, error);
          }
        }),
      });
      execution.request = request;
      return request;
    } catch (e) {
      // The initial mint goes straight to the exchange, so nothing here was raised by the
      // interceptor.
      if (isTerminalMintFailure(e, { raisedByInterceptor: false })) {
        executionAudit.failed(e, serviceAccountId);
      }
      throw e;
    }
  }

  /**
   * The mint interceptor of a workload execution. It runs for the initial mint and again for every
   * reactive re-mint driven by an Elasticsearch 401. That reactive path lives in the Elasticsearch
   * client's unauthorized error handler, far outside the execution's call stack, so this is the only
   * place a binding check can reach it. The initial mint follows the verification that started the
   * execution, and is let through on its strength rather than paying for the read twice.
   *
   * `onTerminalFailure` is called with a failure the registry latches (see `isTerminalMintFailure`),
   * whether the binding check refused or the exchange behind it did. The exchange is how a deleted
   * or recreated account shows up, since its binding still names the same id. A latched failure
   * ends the execution's credentials for good, so it is called at most once. A failure on a blip
   * is retried, and is not reported.
   */
  private rebindCheck(
    coordinates: WorkloadBindingCoordinates,
    serviceAccountId: string,
    onTerminalFailure: (error: Error) => void
  ): ServiceAccountMintInterceptor {
    let minted = false;

    return async (mint) => {
      if (!minted) {
        minted = true;
        return await mint();
      }

      try {
        const current = await this.requireBinding(coordinates);
        if (current.serviceAccountId !== serviceAccountId) {
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
        if (isTerminalMintFailure(e, { raisedByInterceptor: true })) {
          onTerminalFailure(e);
        }
        throw e;
      }

      try {
        return await mint();
      } catch (e) {
        if (isTerminalMintFailure(e, { raisedByInterceptor: false })) {
          onTerminalFailure(e);
        }
        throw e;
      }
    };
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
