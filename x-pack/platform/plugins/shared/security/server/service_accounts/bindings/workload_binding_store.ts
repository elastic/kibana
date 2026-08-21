/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { nodeBuilder } from '@kbn/es-query';

import type { WorkloadBindingAttributes, WorkloadBindingCoordinates } from './binding_saved_object';
import {
  getWorkloadBindingId,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
import { getDetailedErrorMessage } from '../../errors';

/** Pages of this size are walked when listing every workload bound to a service account. */
const FIND_PAGE_SIZE = 100;

export interface WorkloadBindingStoreOptions {
  client: SavedObjectsClientContract;
  encryptedClient: EncryptedSavedObjectsClient;
  isEncryptionError: (error: Error) => boolean;
  logger: Logger;
}

const toBinding = (attributes: WorkloadBindingAttributes): ServiceAccountWorkloadBinding => ({
  operationType: attributes.operationType,
  workloadType: attributes.workloadType,
  workloadId: attributes.workloadId,
  serviceAccountId: attributes.serviceAccountId,
  spaceId: attributes.spaceId,
  attachedBy: attributes.attachedBy,
  attachedAt: attributes.attachedAt,
});

/**
 * Persistence for workload bindings, and the only place that touches the binding saved object.
 *
 * Bindings are written whole and never partially updated: their attributes are authenticated by
 * the encrypted canary, and a partial update would rewrite the document without re-deriving that
 * authentication — silently making the binding undecryptable.
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
  async set(attributes: WorkloadBindingAttributes): Promise<ServiceAccountWorkloadBinding> {
    const id = getWorkloadBindingId(attributes);

    await this.client.create<WorkloadBindingAttributes>(
      SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      attributes,
      { id, overwrite: true, refresh: 'wait_for' }
    );

    return toBinding(attributes);
  }

  /**
   * Removes the binding. Resolves `false` when there was nothing to remove, so a repeated detach
   * is not an error: the caller's desired end state has been reached either way.
   */
  async delete(coordinates: WorkloadBindingCoordinates): Promise<boolean> {
    try {
      await this.client.delete(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(coordinates),
        { refresh: 'wait_for' }
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
          id
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

    // The coordinates are authenticated data, so a mismatch cannot come from tampering — it would
    // mean this ID was derived from different coordinates than the ones stored under it.
    if (
      attributes.operationType !== coordinates.operationType ||
      attributes.workloadType !== coordinates.workloadType ||
      attributes.workloadId !== coordinates.workloadId ||
      attributes.spaceId !== coordinates.spaceId
    ) {
      this.logger.error(
        `Service account workload binding [${id}] does not describe the workload it was looked up by.`
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
}
