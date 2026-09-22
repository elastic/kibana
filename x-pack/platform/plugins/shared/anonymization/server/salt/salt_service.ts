/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import type { SavedObjectsServiceStart, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

export const ANONYMIZATION_SALT_SAVED_OBJECT_TYPE = 'anonymization-salt';

/** Length of generated salt in bytes (32 bytes = 256 bits). */
const SALT_LENGTH_BYTES = 32;
const REPLACEMENTS_ENCRYPTION_KEY_LENGTH_BYTES = 32;
const SALT_ID_NAMESPACE = uuidv5.DNS;

const getSaltSavedObjectId = (namespace: string): string =>
  uuidv5(`${ANONYMIZATION_SALT_SAVED_OBJECT_TYPE}:${namespace}`, SALT_ID_NAMESPACE);

interface SaltAttributes {
  salt: string;
  replacementsEncryptionKey?: string;
}

/**
 * Service for managing per-space encrypted salt material used for
 * deterministic tokenization. The salt is stored as an encrypted saved
 * object and is never exposed to client-side code.
 */
export class SaltService {
  constructor(
    private readonly savedObjects: SavedObjectsServiceStart,
    private readonly encryptedSavedObjects: EncryptedSavedObjectsPluginStart,
    private readonly logger: Logger
  ) {}

  /**
   * Gets the per-space salt, creating it if it doesn't exist.
   * The salt is stored as an encrypted saved object keyed by a deterministic UUID per namespace.
   */
  async getSalt(namespace: string): Promise<string> {
    const keyMaterial = await this.getOrCreateKeyMaterial(namespace);
    return keyMaterial.salt;
  }

  /**
   * Gets the per-space replacements encryption key, creating it if it doesn't exist.
   * Stored with the same hidden encrypted SO as salt material.
   */
  async getReplacementsEncryptionKey(namespace: string): Promise<string> {
    const keyMaterial = await this.getOrCreateKeyMaterial(namespace);
    return keyMaterial.replacementsEncryptionKey;
  }

  private async getOrCreateKeyMaterial(
    namespace: string
  ): Promise<{ salt: string; replacementsEncryptionKey: string }> {
    const id = getSaltSavedObjectId(namespace);
    const soNamespace = namespace === 'default' ? undefined : namespace;

    try {
      const esoClient = this.encryptedSavedObjects.getClient({
        includedHiddenTypes: [ANONYMIZATION_SALT_SAVED_OBJECT_TYPE],
      });

      const { attributes } = await esoClient.getDecryptedAsInternalUser<SaltAttributes>(
        ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
        id,
        { namespace: soNamespace }
      );

      if (attributes.replacementsEncryptionKey) {
        return {
          salt: attributes.salt,
          replacementsEncryptionKey: attributes.replacementsEncryptionKey,
        };
      }

      const replacementsEncryptionKey = randomBytes(
        REPLACEMENTS_ENCRYPTION_KEY_LENGTH_BYTES
      ).toString('hex');
      const persisted = await this.updateKeyMaterial(namespace, id, {
        replacementsEncryptionKey,
      });
      if (!persisted) {
        // 409 conflict: another process wrote first — re-read to get the persisted key
        return this.getOrCreateKeyMaterial(namespace);
      }
      return { salt: attributes.salt, replacementsEncryptionKey };
    } catch (err) {
      if (err?.output?.statusCode === 404 || err?.statusCode === 404) {
        return this.createKeyMaterial(namespace);
      }
      throw err;
    }
  }

  /**
   * Creates a new per-space salt. Idempotent: if a concurrent create
   * produced a conflict, reads and returns the existing salt.
   */
  private async createKeyMaterial(
    namespace: string
  ): Promise<{ salt: string; replacementsEncryptionKey: string }> {
    const id = getSaltSavedObjectId(namespace);
    const salt = randomBytes(SALT_LENGTH_BYTES).toString('hex');
    const replacementsEncryptionKey = randomBytes(
      REPLACEMENTS_ENCRYPTION_KEY_LENGTH_BYTES
    ).toString('hex');

    const internalSoClient = this.savedObjects
      .getUnsafeInternalClient({
        includedHiddenTypes: [ANONYMIZATION_SALT_SAVED_OBJECT_TYPE],
      })
      .asScopedToNamespace(namespace);

    try {
      await internalSoClient.create<SaltAttributes>(
        ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
        { salt, replacementsEncryptionKey },
        { id }
      );

      this.logger.info(`Created anonymization salt for space: ${namespace}`);
      return { salt, replacementsEncryptionKey };
    } catch (err) {
      // Handle race condition: another request created it first
      if (err?.statusCode === 409) {
        this.logger.debug(`Salt already exists for space: ${namespace}, reading existing`);
        return this.getOrCreateKeyMaterial(namespace);
      }
      throw err;
    }
  }

  /**
   * @returns `true` if the update was persisted, `false` on 409 version conflict.
   */
  private async updateKeyMaterial(
    namespace: string,
    id: string,
    attributes: Partial<SaltAttributes>
  ): Promise<boolean> {
    const internalSoClient = this.savedObjects
      .getUnsafeInternalClient({
        includedHiddenTypes: [ANONYMIZATION_SALT_SAVED_OBJECT_TYPE],
      })
      .asScopedToNamespace(namespace);

    try {
      await internalSoClient.update<SaltAttributes>(
        ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
        id,
        attributes
      );
      return true;
    } catch (err) {
      if (err?.statusCode === 409) {
        this.logger.debug(`Salt key material update conflict in space: ${namespace}, re-reading`);
        return false;
      }
      throw err;
    }
  }
}
