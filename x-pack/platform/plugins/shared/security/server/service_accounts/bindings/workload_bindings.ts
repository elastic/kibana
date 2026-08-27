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
  AttachServiceAccountWorkloadParams,
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadCoordinates,
} from '@kbn/core-security-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

import type { WorkloadBindingCoordinates } from './binding_saved_object';
import { resolveWorkloadAttacher } from './resolve_workload_attacher';
import type { WorkloadBindingStore } from './workload_binding_store';
import type { AuthenticatedUser, SecurityLicense } from '../../../common';
import { getDetailedErrorMessage } from '../../errors';
import type { ServiceAccountsBackend } from '../types';

/**
 * Size of a binding's canary. Only needs to be unguessable — it is never read for its content,
 * and exists so that every other attribute is covered by an authentication tag.
 */
const CANARY_BYTE_LENGTH = 32;

/**
 * Manages and executes workload bindings for a single operation type per call. Operation types are
 * claimed at setup and reach this API only through the capability handle Core hands back, so an
 * operation can never address another's bindings.
 */
export interface ServiceAccountWorkloadBindingsApi {
  attach(
    operationType: string,
    request: KibanaRequest,
    params: AttachServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding>;

  detach(
    operationType: string,
    request: KibanaRequest,
    params: { workloadType: string; workloadId: string }
  ): Promise<void>;

  getBinding(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null>;

  withScopedRequest<T>(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T>;
}

export interface ServiceAccountWorkloadBindingsOptions {
  logger: Logger;
  license: SecurityLicense;
  store: WorkloadBindingStore;
  backend: ServiceAccountsBackend;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  /**
   * Resolves the user profile behind a request, including the creator of an API key. Used to keep
   * bindings traceable to a person; failures are tolerated rather than failing the attach.
   */
  getCurrentProfileId: (request: KibanaRequest) => Promise<string | null>;
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
  private readonly getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  private readonly getCurrentProfileId: (request: KibanaRequest) => Promise<string | null>;
  private readonly getSpaceId: (request: KibanaRequest) => string;
  private readonly canEncrypt: boolean;

  constructor({
    logger,
    license,
    store,
    backend,
    checkPrivilegesWithRequest,
    getCurrentUser,
    getCurrentProfileId,
    getSpaceId,
    canEncrypt,
  }: ServiceAccountWorkloadBindingsOptions) {
    this.logger = logger;
    this.license = license;
    this.store = store;
    this.backend = backend;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.getCurrentUser = getCurrentUser;
    this.getCurrentProfileId = getCurrentProfileId;
    this.getSpaceId = getSpaceId;
    this.canEncrypt = canEncrypt;
  }

  async attach(
    operationType: string,
    request: KibanaRequest,
    { serviceAccountId, workloadType, workloadId }: AttachServiceAccountWorkloadParams
  ): Promise<ServiceAccountWorkloadBinding> {
    this.ensureAvailable();

    const user = this.getCurrentUser(request);
    if (!user) {
      throw Boom.unauthorized(
        'Cannot attach a service account to a workload: the request is not authenticated'
      );
    }

    const { hasAllRequested } = await this.checkPrivilegesWithRequest(request).globally({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(
        'Cannot attach a service account to a workload: missing `manage_security` cluster privilege'
      );
    }

    const spaceId = this.getSpaceId(request);

    const binding = await this.store.set({
      operationType,
      workloadType,
      workloadId,
      serviceAccountId,
      spaceId,
      attachedBy: await resolveWorkloadAttacher(user, () => this.resolveUserProfileId(request)),
      attachedAt: new Date().toISOString(),
      // Regenerated on every attach so a re-bind cannot be rolled back to a previous binding by
      // restoring an older copy of the document.
      canary: randomBytes(CANARY_BYTE_LENGTH).toString('base64'),
    });

    this.logger.debug(
      `Attached a service account to workload [${workloadType}/${workloadId}] of operation [${operationType}]`
    );

    return binding;
  }

  async detach(
    operationType: string,
    request: KibanaRequest,
    { workloadType, workloadId }: { workloadType: string; workloadId: string }
  ): Promise<void> {
    this.ensureAvailable();

    // Same gate as attach: unbinding a workload silently drops it to no identity at all, which is
    // as much a privileged change as granting one.
    const { hasAllRequested } = await this.checkPrivilegesWithRequest(request).globally({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(
        'Cannot detach a service account from a workload: missing `manage_security` cluster privilege'
      );
    }

    const deleted = await this.store.delete({
      operationType,
      workloadType,
      workloadId,
      spaceId: this.getSpaceId(request),
    });

    if (deleted) {
      this.logger.debug(
        `Detached the service account from workload [${workloadType}/${workloadId}] of operation [${operationType}]`
      );
    }
  }

  async getBinding(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null> {
    this.ensureAvailable();
    return await this.store.getVerified(this.toCoordinates(operationType, params));
  }

  async withScopedRequest<T>(
    operationType: string,
    params: ServiceAccountWorkloadCoordinates,
    fn: (request: KibanaRequest) => Promise<T>
  ): Promise<T> {
    this.ensureAvailable();

    const coordinates = this.toCoordinates(operationType, params);
    const binding = await this.requireBinding(coordinates);

    const request = await this.backend.createFakeRequest({
      serviceAccountId: binding.serviceAccountId,
      spaceId: coordinates.spaceId,
      // No time-based lease: the binding check below runs before every mint, which is both
      // stricter and revocable — detaching the workload kills a running execution's credential
      // rather than waiting for a lease to lapse.
      maxLifetimeMs: Number.POSITIVE_INFINITY,
      // Runs for the initial mint and again for every reactive re-mint driven by an
      // Elasticsearch 401. That reactive path lives in the Elasticsearch client's unauthorized
      // error handler, far outside this call stack, so this interceptor is the only place a
      // binding check can cover both.
      mintInterceptor: async (mint) => {
        const current = await this.requireBinding(coordinates);

        if (current.serviceAccountId !== binding.serviceAccountId) {
          throw Boom.forbidden(
            'The workload was bound to a different service account; refusing to mint a credential for the previous one.'
          );
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
   * Best-effort: attribution is worth an extra lookup, but never worth failing an attach the
   * caller is otherwise entitled to make.
   */
  private async resolveUserProfileId(request: KibanaRequest): Promise<string | undefined> {
    try {
      return (await this.getCurrentProfileId(request)) ?? undefined;
    } catch (e) {
      this.logger.debug(
        `Could not resolve a user profile for the principal attaching a service account: ${getDetailedErrorMessage(
          e
        )}`
      );
      return undefined;
    }
  }

  private async requireBinding(
    coordinates: WorkloadBindingCoordinates
  ): Promise<ServiceAccountWorkloadBinding> {
    const binding = await this.store.getVerified(coordinates);

    if (!binding) {
      throw Boom.notFound(
        `No service account is bound to workload [${coordinates.workloadType}/${coordinates.workloadId}] of operation [${coordinates.operationType}].`
      );
    }

    return binding;
  }

  private toCoordinates(
    operationType: string,
    { workloadType, workloadId, spaceId }: ServiceAccountWorkloadCoordinates
  ): WorkloadBindingCoordinates {
    return {
      operationType,
      workloadType,
      workloadId,
      spaceId: spaceId ?? DEFAULT_SPACE_ID,
    };
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

/**
 * Stand-in for runtimes whose service account backend cannot execute workloads. Attach refuses
 * too: a binding that can never be exchanged for a credential is a promise Kibana cannot keep.
 *
 * See https://github.com/elastic/kibana/issues/284466.
 */
export const createNotImplementedWorkloadBindings = (): ServiceAccountWorkloadBindingsApi => {
  const notImplemented = () => {
    throw Boom.notImplemented(
      'Service account workload bindings are not yet implemented for the Elasticsearch backend'
    );
  };

  return {
    attach: async () => notImplemented(),
    detach: async () => notImplemented(),
    getBinding: async () => notImplemented(),
    withScopedRequest: async () => notImplemented(),
  };
};
