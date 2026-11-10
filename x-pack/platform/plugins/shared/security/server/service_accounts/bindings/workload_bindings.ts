/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { randomBytes } from 'crypto';
import pMap from 'p-map';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  BindServiceAccountWorkloadParams,
  ServiceAccountSummary,
  ServiceAccountWorkloadBinder,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadBindingChange,
  ServiceAccountWorkloadBindingChangeError,
  ServiceAccountWorkloadBindingChangeResult,
  ServiceAccountWorkloadCoordinates,
  ServiceAccountWorkloadRef,
  ServiceAccountWorkloadRequestParams,
} from '@kbn/core-security-server';
import type {
  AuditLogger,
  AuditServiceSetup,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import type { WorkloadBindingAttributes, WorkloadBindingCoordinates } from './binding_saved_object';
import { bestEffortUserProfileIdResolver, resolveWorkloadBinder } from './resolve_workload_binder';
import type { WorkloadBindingStore, WorkloadBindingWriteOutcome } from './workload_binding_store';
import type { AuthenticatedUser, SecurityLicense } from '../../../common';
import type { ServiceAccountAuditEventParams } from '../../audit';
import { ServiceAccountAuditAction, serviceAccountAuditEvent } from '../../audit';
import { getDetailedErrorMessage, getErrorStatusCode, toErrorStatusCode } from '../../errors';
import { clusterPrivilegeRefusal, hasClusterPrivilege } from '../cluster_privilege';
import type { ServiceAccountMintInterceptor } from '../fake_requests';
import { isTerminalMintFailure } from '../fake_requests';
import type { ServiceAccountsBackend } from '../types';

/**
 * Size of a binding's canary. Only needs to be unguessable — it is never read for its content,
 * and exists so that every other attribute is covered by an authentication tag.
 */
const CANARY_BYTE_LENGTH = 32;

/**
 * How many prior bindings a bulk update reads at once. Each read is a verified, single-document
 * get, since only a verified binding may name an account in the audit log.
 */
const PREVIOUS_BINDING_READ_CONCURRENCY = 10;

/**
 * The outcome of one change, as {@link ServiceAccountWorkloadBindings.applyChanges} reports it.
 * A failure keeps the error it failed with, so a single-workload call can throw it unchanged.
 */
type ChangeOutcome =
  | {
      op: 'bind';
      ok: true;
      binding: ServiceAccountWorkloadBinding;
      previousServiceAccountId?: string;
    }
  | { op: 'unbind'; ok: true; removed: boolean; previousServiceAccountId?: string }
  | { op: ServiceAccountWorkloadBindingChange['op']; ok: false; error: Error };

/** The account a workload was bound to before a change, or why it could not be read. */
type PreviousBinding = { ok: true; serviceAccountId?: string } | { ok: false; error: Error };

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(getDetailedErrorMessage(error));

/**
 * Why a change failed, as the bulk update reports it. A client error keeps its message, as the
 * same call for that one workload would have thrown it. Anything else is reported with its status
 * and a generic message, since its details can carry what the caller's own client must not see.
 */
const toChangeError = (error: Error): ServiceAccountWorkloadBindingChangeError => {
  const boom = Boom.isBoom(error)
    ? error
    : new Boom.Boom(error.message, { statusCode: toErrorStatusCode(getErrorStatusCode(error)) });
  const {
    statusCode,
    payload: { message },
  } = boom.output;
  return { statusCode, message };
};

/** The account a change replaced or removed, when it is known, for the change's outcome. */
const previousAccount = (prior: PreviousBinding): { previousServiceAccountId?: string } =>
  prior.ok && prior.serviceAccountId !== undefined
    ? { previousServiceAccountId: prior.serviceAccountId }
    : {};

/** Stands in for a write outcome the store did not report, which it always does. */
const missingWriteOutcome = (): { ok: false; error: Error } => ({
  ok: false,
  error: Boom.internal('The binding write reported no outcome for this workload.'),
});

/**
 * Runs one bulk write and reports an outcome per binding. A write that fails as a whole fails each
 * of its bindings with the same error, and a write with nothing to do is never sent.
 */
const settleBulkWrite = async <T>(
  count: number,
  write: () => Promise<Array<WorkloadBindingWriteOutcome<T>>>
): Promise<Array<WorkloadBindingWriteOutcome<T> | { ok: false; error: Error }>> => {
  if (count === 0) {
    return [];
  }

  try {
    return await write();
  } catch (e) {
    const error = toError(e);
    return Array.from({ length: count }, () => ({ ok: false as const, error }));
  }
};

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

  bulkUpdateWorkloadBindings(
    pluginId: string,
    request: KibanaRequest,
    changes: readonly ServiceAccountWorkloadBindingChange[]
  ): Promise<ServiceAccountWorkloadBindingChangeResult[]>;

  getBinding(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  getServiceAccountSummary(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountSummary | null>;

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

/** The audit events of one change to a workload's binding. */
interface BindingAudit {
  /** The change is authorized and about to be written. */
  intent(action: ServiceAccountAuditAction, serviceAccountId?: string): void;
  /** The change is refused, because the request may not change bindings. */
  refused(action: ServiceAccountAuditAction, serviceAccountId?: string): (error: Error) => void;
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
    const [outcome] = await this.applyChanges(pluginId, request, [
      { op: 'bind', serviceAccountId, workloadType, workloadId },
    ]);

    if (!outcome.ok) {
      throw outcome.error;
    }
    if (outcome.op !== 'bind') {
      throw new Error('A bind of one workload reported the outcome of an unbind.');
    }
    return outcome.binding;
  }

  async unbindWorkload(
    pluginId: string,
    request: KibanaRequest,
    { workloadType, workloadId }: ServiceAccountWorkloadRef
  ): Promise<boolean> {
    const [outcome] = await this.applyChanges(pluginId, request, [
      { op: 'unbind', workloadType, workloadId },
    ]);

    if (!outcome.ok) {
      throw outcome.error;
    }
    if (outcome.op !== 'unbind') {
      throw new Error('An unbind of one workload reported the outcome of a bind.');
    }
    return outcome.removed;
  }

  async bulkUpdateWorkloadBindings(
    pluginId: string,
    request: KibanaRequest,
    changes: readonly ServiceAccountWorkloadBindingChange[]
  ): Promise<ServiceAccountWorkloadBindingChangeResult[]> {
    const outcomes = await this.applyChanges(pluginId, request, changes);
    // The changes each server error failed, so that one error is logged once, however many
    // changes it failed: a write that fails as a whole fails every change in it.
    const serverErrors = new Map<Error, ServiceAccountWorkloadBindingChange[]>();

    const results = outcomes.map((outcome, index): ServiceAccountWorkloadBindingChangeResult => {
      const change = changes[index];
      const { workloadType, workloadId } = change;
      if (outcome.ok) {
        return { workloadType, workloadId, ...outcome };
      }

      const error = toChangeError(outcome.error);
      if (error.statusCode >= 500) {
        serverErrors.set(outcome.error, [...(serverErrors.get(outcome.error) ?? []), change]);
      }
      return { workloadType, workloadId, op: outcome.op, ok: false, error };
    });

    for (const [error, failed] of serverErrors) {
      this.logChangeFailure(pluginId, failed, error);
    }

    return results;
  }

  async getBinding(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null> {
    this.ensureAvailable();
    return await this.store.getVerified(this.toCoordinates(pluginId, params));
  }

  /**
   * Names the account of the workload's verified binding, never an account the caller names, so
   * that it can only describe an account the workload runs as.
   */
  async getServiceAccountSummary(
    pluginId: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountSummary | null> {
    const binding = await this.getBinding(pluginId, params);
    return binding ? await this.backend.getSummary(binding.serviceAccountId) : null;
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
   * Applies binding changes in the space of the request, and reports the outcome of each, in the
   * order given. Both the single-workload methods and the bulk update are this, so a change is
   * authorized, audited, and written the same way whichever of them makes it.
   *
   * The call rejects, before anything is audited, when bindings are unavailable, when a change
   * binds an account and the request is not authenticated, or when the privilege check itself
   * fails. Past that point a change fails on its own: a refusal, a prior binding that cannot be
   * read, or a write that fails is that change's outcome, and leaves the others to go ahead.
   */
  private async applyChanges(
    pluginId: string,
    request: KibanaRequest,
    changes: readonly ServiceAccountWorkloadBindingChange[]
  ): Promise<ChangeOutcome[]> {
    this.ensureAvailable();

    if (changes.length === 0) {
      return [];
    }

    // Only a bind records who made it. An unbind needs nothing but the privilege, which is checked
    // against the request whatever principal it carries.
    const user = this.getCurrentUser(request);
    if (!user && changes.some(({ op }) => op === 'bind')) {
      throw Boom.unauthorized(
        'Cannot bind a service account to a workload: the request is not authenticated'
      );
    }

    const auditLogger = this.audit.asScoped(request);
    const audits = changes.map(({ workloadType, workloadId }) =>
      this.bindingAudit(auditLogger, { plugin_id: pluginId, type: workloadType, id: workloadId })
    );

    if (
      !(await hasClusterPrivilege({
        request,
        checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
        privilege: 'manage_security',
      }))
    ) {
      return this.refuseChanges(changes, audits);
    }

    const spaceId = this.getSpaceId(request);
    // Picks the coordinates out explicitly, so a caller's extra fields never reach the store.
    const coordinates = changes.map(
      ({ workloadType, workloadId }): WorkloadBindingCoordinates => ({
        pluginId,
        workloadType,
        workloadId,
        spaceId,
      })
    );

    // The bindings a change replaces or removes, read first, verified, for the events. A change
    // whose prior binding cannot be read is not applied: its write would share the failure.
    const previous = await pMap(
      coordinates,
      async (workload): Promise<PreviousBinding> => {
        try {
          return { ok: true, serviceAccountId: await this.readBoundServiceAccountId(workload) };
        } catch (e) {
          return { ok: false, error: toError(e) };
        }
      },
      { concurrency: PREVIOUS_BINDING_READ_CONCURRENCY }
    );

    // A rebind takes the workload away from one account and gives it to another. Both ends are
    // audited, so that a search on either account finds the change.
    changes.forEach((change, index) => {
      const prior = previous[index];
      if (!prior.ok) {
        return;
      }
      if (change.op === 'unbind') {
        audits[index].intent(ServiceAccountAuditAction.WORKLOAD_UNBIND, prior.serviceAccountId);
        return;
      }
      if (
        prior.serviceAccountId !== undefined &&
        prior.serviceAccountId !== change.serviceAccountId
      ) {
        audits[index].intent(ServiceAccountAuditAction.WORKLOAD_UNBIND, prior.serviceAccountId);
      }
      audits[index].intent(ServiceAccountAuditAction.WORKLOAD_BIND, change.serviceAccountId);
    });

    const binds: Array<{ index: number; attributes: WorkloadBindingAttributes }> = [];
    const unbinds: Array<{ index: number; coordinates: WorkloadBindingCoordinates }> = [];
    // One binder and one time for the whole call: every binding it writes was made by the same
    // principal, at the same moment.
    let binder: Promise<ServiceAccountWorkloadBinder> | undefined;
    const boundAt = new Date().toISOString();
    for (const [index, change] of changes.entries()) {
      if (!previous[index].ok) {
        continue;
      }
      if (change.op === 'unbind') {
        unbinds.push({ index, coordinates: coordinates[index] });
        continue;
      }
      binder ??= this.resolveBinder(request, user);
      binds.push({
        index,
        attributes: {
          ...coordinates[index],
          serviceAccountId: change.serviceAccountId,
          boundBy: await binder,
          boundAt,
          // Fresh per binding, so no two generations of a binding share one. This does not make a
          // rebind irreversible; see the attribute's own note.
          canary: randomBytes(CANARY_BYTE_LENGTH).toString('base64'),
        },
      });
    }

    const [bindOutcomes, unbindOutcomes] = await Promise.all([
      settleBulkWrite(binds.length, () =>
        this.store.bulkSet(binds.map(({ attributes }) => attributes))
      ),
      settleBulkWrite(unbinds.length, () =>
        this.store.bulkDelete(unbinds.map(({ coordinates: workload }) => workload))
      ),
    ]);

    const bindOutcomeAt = new Map(
      binds.map(({ index }, position) => [index, bindOutcomes[position]] as const)
    );
    const unbindOutcomeAt = new Map(
      unbinds.map(({ index }, position) => [index, unbindOutcomes[position]] as const)
    );

    return changes.map((change, index): ChangeOutcome => {
      const prior = previous[index];
      if (!prior.ok) {
        return { op: change.op, ok: false, error: prior.error };
      }

      const { workloadType, workloadId } = change;
      if (change.op === 'bind') {
        const written = bindOutcomeAt.get(index) ?? missingWriteOutcome();
        if (!written.ok) {
          return { op: 'bind', ok: false, error: written.error };
        }

        this.logger.debug(
          `Bound a service account to workload [${workloadType}/${workloadId}] of plugin [${pluginId}]`
        );
        return { op: 'bind', ok: true, binding: written.value, ...previousAccount(prior) };
      }

      const deleted = unbindOutcomeAt.get(index) ?? missingWriteOutcome();
      if (!deleted.ok) {
        return { op: 'unbind', ok: false, error: deleted.error };
      }

      if (deleted.value) {
        this.logger.debug(
          `Unbound the service account from workload [${workloadType}/${workloadId}] of plugin [${pluginId}] in space [${spaceId}]`
        );
      } else {
        // Worth a warning rather than silence: a plugin deleting a workload from the wrong space
        // would otherwise leave a binding behind with nothing to show for it.
        this.logger.warn(
          `Unbinding matched no binding for workload [${workloadType}/${workloadId}] of plugin [${pluginId}] in space [${spaceId}]`
        );
      }
      return { op: 'unbind', ok: true, removed: deleted.value, ...previousAccount(prior) };
    });
  }

  /**
   * Refuses every change, for a request that may not change bindings. Each change is refused with
   * the message its own operation is refused with alone, and is audited as a refusal on its own.
   * The refusal is logged once per operation, not once per change.
   */
  private refuseChanges(
    changes: readonly ServiceAccountWorkloadBindingChange[],
    audits: readonly BindingAudit[]
  ): ChangeOutcome[] {
    // Each made on first use, so a refusal is logged once per operation.
    let bindRefusal: Boom.Boom | undefined;
    let unbindRefusal: Boom.Boom | undefined;
    const refuse = (action: string): Boom.Boom =>
      clusterPrivilegeRefusal({ logger: this.logger, privilege: 'manage_security', action });

    return changes.map((change, index): ChangeOutcome => {
      if (change.op === 'bind') {
        bindRefusal ??= refuse('bind a service account to a workload');
        audits[index].refused(
          ServiceAccountAuditAction.WORKLOAD_BIND,
          change.serviceAccountId
        )(bindRefusal);
        return { op: 'bind', ok: false, error: bindRefusal };
      }

      unbindRefusal ??= refuse('unbind a service account from a workload');
      audits[index].refused(ServiceAccountAuditAction.WORKLOAD_UNBIND)(unbindRefusal);
      return { op: 'unbind', ok: false, error: unbindRefusal };
    });
  }

  /** Records who is making a bind, best effort beyond the principal itself. */
  private async resolveBinder(
    request: KibanaRequest,
    user: AuthenticatedUser | null
  ): Promise<ServiceAccountWorkloadBinder> {
    if (!user) {
      throw Boom.unauthorized(
        'Cannot bind a service account to a workload: the request is not authenticated'
      );
    }

    return await resolveWorkloadBinder(
      user,
      bestEffortUserProfileIdResolver(this.getCurrentUserProfileId, request, this.logger)
    );
  }

  /**
   * Logs a server error that failed changes, with the details the bulk update keeps from its
   * caller. One line per error: the workload when it failed one change, else how many it failed.
   */
  private logChangeFailure(
    pluginId: string,
    [first, ...rest]: readonly ServiceAccountWorkloadBindingChange[],
    error: Error
  ): void {
    const detail = getDetailedErrorMessage(error);
    const workload = `[${first.workloadType}/${first.workloadId}]`;
    this.logger.error(
      rest.length === 0
        ? `Failed to ${first.op} workload ${workload} of plugin [${pluginId}]: ${detail}`
        : `Failed to change the bindings of ${
            rest.length + 1
          } workloads of plugin [${pluginId}], including ${workload}: ${detail}`
    );
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
    auditLogger: AuditLogger,
    workload: NonNullable<ServiceAccountAuditEventParams['workload']>
  ): BindingAudit {
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
      intent: (action, serviceAccountId) => log(action, serviceAccountId, { outcome: 'unknown' }),
      refused: (action, serviceAccountId) => (error) => log(action, serviceAccountId, { error }),
    };
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
