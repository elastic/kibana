/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { Logger, SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';

import type { WorkloadBindingAttributes, WorkloadBindingCoordinates } from './binding_saved_object';
import {
  getWorkloadBindingId,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
import { getDetailedErrorMessage } from '../../errors';

/** Pages of this size are walked when listing every workload bound to a service account. */
const FIND_PAGE_SIZE = 100;

const BOUND_AT_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.boundAt`;
const BINDING_KEY_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.bindingKey`;

/** A binding as the stale binding sweep reads it, unverified. */
export type SweptWorkloadBinding = ServiceAccountWorkloadBinding & { bindingKey?: string };

/**
 * What re-reading a binding just before acting on it found.
 *
 * - `verified`: it passed integrity verification and still names the expected account and time.
 * - `integrity_failed`: it failed integrity verification.
 * - `changed`: it was rebound since it was read.
 * - `absent`: it is gone.
 */
export type WorkloadBindingVerification = 'verified' | 'integrity_failed' | 'changed' | 'absent';

export interface WorkloadBindingStoreOptions {
  client: SavedObjectsClientContract;
  encryptedClient: EncryptedSavedObjectsClient;
  isEncryptionError: (error: Error) => boolean;
  logger: Logger;
}

const toBinding = (attributes: WorkloadBindingAttributes): ServiceAccountWorkloadBinding => ({
  pluginId: attributes.pluginId,
  workloadType: attributes.workloadType,
  workloadId: attributes.workloadId,
  serviceAccountId: attributes.serviceAccountId,
  spaceId: attributes.spaceId,
  boundBy: attributes.boundBy,
  boundAt: attributes.boundAt,
});

/**
 * Persistence for workload bindings.
 */
export class WorkloadBindingStore {
  private readonly client: SavedObjectsClientContract;
  private readonly encryptedClient: EncryptedSavedObjectsClient;
  private readonly isEncryptionError: (error: Error) => boolean;
  private readonly logger: Logger;

  constructor({ client, encryptedClient, isEncryptionError, logger }: WorkloadBindingStoreOptions) {
    this.client = client;
    this.encryptedClient = encryptedClient;
    this.isEncryptionError = isEncryptionError;
    this.logger = logger;
  }

  /**
   * Writes the binding, replacing any existing one for the same coordinates. Re-binding a workload
   * to a different service account is the same call as binding it for the first time.
   */
  async set(
    attributes: Omit<WorkloadBindingAttributes, 'bindingKey'>
  ): Promise<ServiceAccountWorkloadBinding> {
    const id = getWorkloadBindingId(attributes);

    await this.client.create<WorkloadBindingAttributes>(
      SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      { ...attributes, bindingKey: id },
      { id, namespace: attributes.spaceId, overwrite: true, refresh: 'wait_for' }
    );

    return toBinding(attributes);
  }

  /**
   * Removes the binding. Resolves `false` when there was nothing to remove, so a repeated unbind
   * is not an error: the caller's desired end state has been reached either way.
   */
  async delete(coordinates: WorkloadBindingCoordinates): Promise<boolean> {
    try {
      await this.client.delete(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(coordinates),
        { namespace: coordinates.spaceId, refresh: 'wait_for' }
      );
      return true;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Reads the binding and verifies its integrity, resolving `null` when the workload has none.
   *
   * Throws when the stored document fails verification, which means its attributes were modified
   * outside of Kibana — callers must treat this as a refusal and never fall back to minting a
   * credential.
   */
  async getVerified(
    coordinates: WorkloadBindingCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null> {
    const id = getWorkloadBindingId(coordinates);

    let attributes: WorkloadBindingAttributes;
    try {
      ({ attributes } =
        await this.encryptedClient.getDecryptedAsInternalUser<WorkloadBindingAttributes>(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          id,
          { namespace: coordinates.spaceId }
        ));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }

      if (e instanceof Error && this.isEncryptionError(e)) {
        this.logger.error(
          `Service account workload binding [${id}] failed integrity verification: ${getDetailedErrorMessage(
            e
          )}`
        );
        throw Boom.forbidden(
          'The service account binding for this workload failed integrity verification.'
        );
      }

      throw e;
    }

    // Decryption skips an encrypted attribute that is absent rather than failing, so a document
    // whose canary was stripped would "decrypt" without any of its other attributes having been
    // authenticated. The canary's presence is what proves the authentication tag was checked.
    if (typeof attributes.canary !== 'string' || attributes.canary.length === 0) {
      this.logger.error(
        `Service account workload binding [${id}] failed integrity verification: the canary is missing.`
      );
      throw Boom.forbidden(
        'The service account binding for this workload failed integrity verification.'
      );
    }

    // The coordinates are authenticated data, so a mismatch cannot come from tampering — it would
    // mean this ID was derived from different coordinates than the ones stored under it.
    const mismatches = (['pluginId', 'workloadType', 'workloadId', 'spaceId'] as const)
      .filter((coordinate) => attributes[coordinate] !== coordinates[coordinate])
      .map(
        (coordinate) =>
          `${coordinate}: expected [${coordinates[coordinate]}], got [${attributes[coordinate]}]`
      );
    if (mismatches.length > 0) {
      this.logger.error(
        `Service account workload binding [${id}] does not describe the workload it was looked up by: ${mismatches.join(
          '; '
        )}`
      );
      throw Boom.forbidden('The service account binding for this workload is inconsistent.');
    }

    return toBinding(attributes);
  }

  /**
   * Lists every workload bound to the given service account, across operations and spaces.
   *
   * Deliberately not integrity-verified: this answers "what would break if this service account
   * went away?" over potentially many bindings. Anything acting on the result — deleting a service
   * account because nothing appears to use it, say — must re-read the bindings it cares about
   * through {@link getVerified}.
   */
  async findByServiceAccountId(serviceAccountId: string): Promise<ServiceAccountWorkloadBinding[]> {
    const bindings: ServiceAccountWorkloadBinding[] = [];

    const finder = this.client.createPointInTimeFinder<WorkloadBindingAttributes>({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: FIND_PAGE_SIZE,
      // TODO(legrego): This will need a more refined approach once service accounts
      // support fine-grained authorization checks.
      namespaces: [ALL_NAMESPACES_STRING],
      filter: nodeBuilder.is(
        `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`,
        serviceAccountId
      ),
    });

    try {
      for await (const { saved_objects: savedObjects } of finder.find()) {
        bindings.push(...savedObjects.map(({ attributes }) => toBinding(attributes)));
      }
    } finally {
      await finder.close();
    }

    return bindings;
  }

  /**
   * Counts the workloads bound to each of the given service accounts, across operations and spaces.
   * An account with no bindings is left out of the result.
   *
   * Not integrity-verified, for the same reason as {@link findByServiceAccountId}. The count is
   * for display only.
   */
  async countByServiceAccountIds(serviceAccountIds: string[]): Promise<Map<string, number>> {
    if (serviceAccountIds.length === 0) {
      return new Map();
    }

    const field = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`;
    const { aggregations } = await this.client.find<
      WorkloadBindingAttributes,
      {
        byServiceAccount: estypes.AggregationsTermsAggregateBase<estypes.AggregationsStringTermsBucketKeys>;
      }
    >({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: 0,
      // TODO(legrego): This will need a more refined approach once service accounts
      // support fine-grained authorization checks.
      namespaces: [ALL_NAMESPACES_STRING],
      filter: nodeBuilder.or(serviceAccountIds.map((id) => nodeBuilder.is(field, id))),
      // `include` and `size` cover every id, so each count is exact.
      aggs: {
        byServiceAccount: {
          terms: { field, include: serviceAccountIds, size: serviceAccountIds.length },
        },
      },
    });

    const buckets = aggregations?.byServiceAccount.buckets;
    return new Map(
      (Array.isArray(buckets) ? buckets : []).map(({ key, doc_count: count }) => [
        String(key),
        count,
      ])
    );
  }
  /**
   * Reads one page of the stale binding sweep: bindings made before `cutoff`, ordered by their
   * binding key and starting after `afterKey`. Not integrity-verified. Each page is its own query,
   * so nothing is held open between pages or runs.
   */
  async findPageForSweep({
    cutoff,
    afterKey,
    size,
  }: {
    cutoff: string;
    afterKey?: string;
    size: number;
  }): Promise<SweptWorkloadBinding[]> {
    // Bindings without a key would sort last and end the pass without a key to resume from.
    // `findUnkeyedPage` reads those instead.
    const filter = nodeBuilder.and([
      nodeBuilder.range(BOUND_AT_FIELD, 'lt', cutoff),
      fromKueryExpression(`${BINDING_KEY_FIELD}: *`),
      ...(afterKey !== undefined ? [nodeBuilder.range(BINDING_KEY_FIELD, 'gt', afterKey)] : []),
    ]);

    return await this.findForSweep({ filter, size, sortField: 'bindingKey' });
  }

  /**
   * Reads up to `size` bindings made before `cutoff` that have no binding key, which an older
   * node may still write during an upgrade. Not integrity-verified.
   */
  async findUnkeyedPage({
    cutoff,
    size,
  }: {
    cutoff: string;
    size: number;
  }): Promise<SweptWorkloadBinding[]> {
    const filter = nodeBuilder.and([
      nodeBuilder.range(BOUND_AT_FIELD, 'lt', cutoff),
      fromKueryExpression(`not ${BINDING_KEY_FIELD}: *`),
    ]);
    return await this.findForSweep({ filter, size, sortField: 'boundAt' });
  }

  /**
   * Writes the binding key onto a binding that lacks one, so the sweep can reach it. Resolves
   * `false` when the binding is gone.
   *
   * A partial update is safe here: the key is neither encrypted nor authenticated, so it leaves
   * the canary's authentication intact. The key is derived from the coordinates, so a rebind that
   * races this write ends with the same key.
   */
  async setBindingKey(coordinates: WorkloadBindingCoordinates): Promise<boolean> {
    const id = getWorkloadBindingId(coordinates);
    try {
      await this.client.update<Pick<WorkloadBindingAttributes, 'bindingKey'>>(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        id,
        { bindingKey: id },
        { namespace: coordinates.spaceId }
      );
      return true;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Re-reads a binding, verified, to check that it is still the one that was read before. Errors
   * other than a failed integrity check propagate, since they say nothing about the binding.
   */
  async verifyUnchanged(
    coordinates: WorkloadBindingCoordinates,
    expected: Pick<ServiceAccountWorkloadBinding, 'serviceAccountId' | 'boundAt'>
  ): Promise<WorkloadBindingVerification> {
    let binding: ServiceAccountWorkloadBinding | null;
    try {
      binding = await this.getVerified(coordinates);
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 403) {
        return 'integrity_failed';
      }
      throw e;
    }

    if (!binding) {
      return 'absent';
    }

    return binding.serviceAccountId === expected.serviceAccountId &&
      binding.boundAt === expected.boundAt
      ? 'verified'
      : 'changed';
  }

  private async findForSweep({
    filter,
    size,
    sortField,
  }: {
    filter: SavedObjectsFindOptions['filter'];
    size: number;
    sortField: string;
  }): Promise<SweptWorkloadBinding[]> {
    const { saved_objects: savedObjects } = await this.client.find<WorkloadBindingAttributes>({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: size,
      namespaces: [ALL_NAMESPACES_STRING],
      filter,
      sortField,
      sortOrder: 'asc',
    });

    return savedObjects.map(({ attributes }) => ({
      ...toBinding(attributes),
      ...(attributes.bindingKey !== undefined && { bindingKey: attributes.bindingKey }),
    }));
  }
}
