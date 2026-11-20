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

import type { ServiceAccountCredentialAttributes } from './credential_saved_object';
import { getCredentialId, SERVICE_ACCOUNT_CREDENTIAL_TYPE } from './credential_saved_object';
import { getDetailedErrorMessage } from '../../errors';

/** The credential attributes that may be read without decrypting. */
type UnverifiedCredentialField = Exclude<keyof ServiceAccountCredentialAttributes, 'token'>;

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
   * Which of the given accounts Kibana holds a credential for. Accounts with none are simply
   * absent from the result.
   *
   * The documents are read without decrypting, so this says a credential is on file, not that it
   * still works.
   *
   * An account whose credential cannot be read throws rather than resolving absent. Absent means
   * "Kibana holds nothing for this account", which a caller is entitled to act on, and a document
   * Kibana failed to read is not that.
   */
  async findExisting(serviceAccountIds: string[]): Promise<Set<string>> {
    // Nothing here reads an attribute, but `readUnverified` needs one field, so ask for a cheap one.
    const found = await this.readUnverified(serviceAccountIds, ['serviceAccountId']);
    return new Set(found.keys());
  }

  /**
   * When Kibana created the credential it holds for the account, or `null` when it holds none or
   * the credential records no creation time. Throws like {@link findExisting} when the credential
   * cannot be read.
   *
   * Read without decrypting, so the timestamp is not authenticated. It is good enough to predict
   * whether the exchange will refuse a binding, but never to decide it: only
   * {@link getDecrypted} may do that.
   */
  async getCreatedAt(serviceAccountId: string): Promise<string | null> {
    const found = await this.readUnverified([serviceAccountId], ['createdAt']);
    return found.get(serviceAccountId)?.createdAt ?? null;
  }

  /**
   * Reads only the given attributes of each account's credential, without decrypting. Accounts
   * with no credential are absent from the result, and any other read failure throws.
   *
   * `fields` must name at least one attribute and never `token`, because an empty list makes the
   * saved objects client return the whole document, ciphertext included.
   */
  private async readUnverified<K extends UnverifiedCredentialField>(
    serviceAccountIds: string[],
    fields: readonly [K, ...K[]]
  ): Promise<Map<string, Pick<ServiceAccountCredentialAttributes, K>>> {
    const found = new Map<string, Pick<ServiceAccountCredentialAttributes, K>>();
    if (serviceAccountIds.length === 0) {
      return found;
    }

    const { saved_objects: savedObjects } = await this.client.bulkGet<
      Pick<ServiceAccountCredentialAttributes, K>
    >(
      serviceAccountIds.map((serviceAccountId) => ({
        type: SERVICE_ACCOUNT_CREDENTIAL_TYPE,
        id: getCredentialId(serviceAccountId),
        fields: [...fields],
      }))
    );

    savedObjects.forEach((result, index) => {
      const serviceAccountId = serviceAccountIds[index];
      if (isSavedObjectErrorResult(result)) {
        if (result.error.statusCode === 404) {
          return;
        }
        throw new Error(
          `Failed to read the credential of service account [${serviceAccountId}] ` +
            `(credential [${result.id}]): ${result.error.message}`
        );
      }

      found.set(serviceAccountId, result.attributes);
    });

    return found;
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
