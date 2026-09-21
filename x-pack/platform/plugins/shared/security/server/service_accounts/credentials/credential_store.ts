/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import type {
  ServiceAccountCredentialAttributes,
  ServiceAccountCredentialMetadata,
} from './credential_saved_object';
import { getCredentialId, SERVICE_ACCOUNT_CREDENTIAL_TYPE } from './credential_saved_object';
import { getDetailedErrorMessage } from '../../errors';

export interface ServiceAccountCredentialStoreOptions {
  client: SavedObjectsClientContract;
  encryptedClient: EncryptedSavedObjectsClient;
  isEncryptionError: (error: Error) => boolean;
  logger: Logger;
}

/**
 * Persistence for Elasticsearch service account credentials, and the only place that touches the
 * credential saved object.
 *
 * Credentials are written whole and never partially updated: every attribute is authenticated as
 * AAD, and a partial update would rewrite the document without re-deriving that authentication —
 * silently making the token undecryptable.
 */
export class ServiceAccountCredentialStore {
  private readonly client: SavedObjectsClientContract;
  private readonly encryptedClient: EncryptedSavedObjectsClient;
  private readonly isEncryptionError: (error: Error) => boolean;
  private readonly logger: Logger;

  constructor({
    client,
    encryptedClient,
    isEncryptionError,
    logger,
  }: ServiceAccountCredentialStoreOptions) {
    this.client = client;
    this.encryptedClient = encryptedClient;
    this.isEncryptionError = isEncryptionError;
    this.logger = logger;
  }

  /**
   * Writes the credential, replacing any existing one for the same service account. Overwriting
   * is deliberate: re-creating an account that somehow kept a stale credential document must not
   * fail on the leftover.
   */
  async set(attributes: ServiceAccountCredentialAttributes): Promise<void> {
    await this.client.create<ServiceAccountCredentialAttributes>(
      SERVICE_ACCOUNT_CREDENTIAL_TYPE,
      attributes,
      { id: getCredentialId(attributes.serviceAccountId), overwrite: true, refresh: 'wait_for' }
    );
  }

  /**
   * Removes the credential. Resolves `false` when there was nothing to remove, so a repeated
   * delete is not an error: the caller's desired end state has been reached either way.
   */
  async delete(serviceAccountId: string): Promise<boolean> {
    try {
      await this.client.delete(SERVICE_ACCOUNT_CREDENTIAL_TYPE, getCredentialId(serviceAccountId), {
        refresh: 'wait_for',
      });
      return true;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Reads the metadata of the credentials held for the given accounts, keyed by service account
   * id. Accounts with no credential are simply absent from the result.
   *
   * Reads the plain documents rather than decrypting them, so the answer is cheap for a whole
   * page but also unverified: use it to describe an account, never to decide what it may do.
   */
  async getMetadata(
    serviceAccountIds: string[]
  ): Promise<Map<string, ServiceAccountCredentialMetadata>> {
    const metadata = new Map<string, ServiceAccountCredentialMetadata>();
    if (serviceAccountIds.length === 0) {
      return metadata;
    }

    const { saved_objects: savedObjects } =
      await this.client.bulkGet<ServiceAccountCredentialMetadata>(
        serviceAccountIds.map((serviceAccountId) => ({
          type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
          id: getCredentialId(serviceAccountId),
          // The token is ciphertext and nothing here needs it, so it is left out of the read.
          fields: ['createdAt', 'createdBy'],
        }))
      );

    savedObjects.forEach((result, index) => {
      const serviceAccountId = serviceAccountIds[index];
      if (isSavedObjectErrorResult(result)) {
        if (result.error.statusCode === 404) {
          return;
        }
        throw new Error(
          `Failed to read the credential metadata of service account [${serviceAccountId}] ` +
            `(credential [${result.id}]): ${result.error.message}`
        );
      }

      const { createdAt, createdBy } = result.attributes;
      metadata.set(serviceAccountId, { createdAt, createdBy });
    });

    return metadata;
  }

  /**
   * Reads and decrypts the credential, resolving `null` when the account has none.
   *
   * Throws when the stored document fails verification, which means its attributes were modified
   * outside of Kibana — callers must treat this as a refusal and never fall back to acting
   * without a credential.
   */
  async getDecrypted(serviceAccountId: string): Promise<ServiceAccountCredentialAttributes | null> {
    const id = getCredentialId(serviceAccountId);

    let attributes: ServiceAccountCredentialAttributes;
    try {
      ({ attributes } =
        await this.encryptedClient.getDecryptedAsInternalUser<ServiceAccountCredentialAttributes>(
          SERVICE_ACCOUNT_CREDENTIAL_TYPE,
          id
        ));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }

      if (e instanceof Error && this.isEncryptionError(e)) {
        this.logger.error(
          `Service account credential [${id}] failed integrity verification: ${getDetailedErrorMessage(
            e
          )}`
        );
        throw Boom.forbidden(
          'The credential for this service account failed integrity verification.'
        );
      }

      throw e;
    }

    // Decryption skips an encrypted attribute that is absent rather than failing, and `token` is
    // the only one this type has, so a document whose token was stripped would "decrypt" without
    // any of its other attributes having been authenticated. The token's presence is what proves
    // the authentication tag was checked.
    if (typeof attributes.token !== 'string' || attributes.token.length === 0) {
      this.logger.error(
        `Service account credential [${id}] failed integrity verification: the token is missing.`
      );
      throw Boom.forbidden(
        'The credential for this service account failed integrity verification.'
      );
    }

    return attributes;
  }
}
