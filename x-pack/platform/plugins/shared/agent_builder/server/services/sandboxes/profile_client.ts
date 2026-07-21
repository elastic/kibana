/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  SandboxProfile,
  SandboxProfileCreateRequest,
  SandboxProfileUpdateRequest,
} from '@kbn/agent-builder-common';
import { DEFAULT_SANDBOX_POLICY } from '@kbn/agent-builder-common';
import {
  SANDBOX_PROFILE_SO_TYPE,
  SANDBOX_PROFILE_ATTRIBUTES_IN_AAD,
  SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT,
  type SandboxProfileAttributes,
} from './saved_object';

/** Map SO attributes -> public profile (no secrets). */
const toProfile = (id: string, attrs: SandboxProfileAttributes): SandboxProfile => ({
  id,
  name: attrs.name,
  description: attrs.description,
  provider: attrs.provider,
  runtime: attrs.runtime,
  connection: attrs.connection,
  runtimeConfig: attrs.runtime_config,
  policy: attrs.policy,
  createdAt: attrs.created_at,
  updatedAt: attrs.updated_at,
});

/**
 * CRUD for Sandbox Profiles, backed by an Encrypted Saved Object.
 *
 * Read/list/get return the public shape (secrets stripped). Only the executor's
 * `getWithSecrets` path (internal user) decrypts secrets, and only to build a
 * provider connection — secrets are never returned to the browser.
 */
export class SandboxProfileClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly encryptedSoClient: EncryptedSavedObjectsClient,
    private readonly logger: Logger
  ) {}

  async create(request: SandboxProfileCreateRequest): Promise<SandboxProfile> {
    const now = new Date().toISOString();
    const attributes: SandboxProfileAttributes = {
      name: request.name,
      description: request.description,
      provider: request.provider,
      runtime: request.runtime,
      connection: request.connection,
      runtime_config: request.runtimeConfig,
      policy: request.policy ?? DEFAULT_SANDBOX_POLICY,
      created_at: now,
      updated_at: now,
      secrets: request.secrets ?? {},
    };
    const so = await this.soClient.create<SandboxProfileAttributes>(
      SANDBOX_PROFILE_SO_TYPE,
      attributes,
      request.id ? { id: request.id } : undefined
    );
    return toProfile(so.id, so.attributes);
  }

  async list(): Promise<SandboxProfile[]> {
    const finder = this.soClient.createPointInTimeFinder<SandboxProfileAttributes>({
      type: SANDBOX_PROFILE_SO_TYPE,
      perPage: 100,
    });
    const profiles: SandboxProfile[] = [];
    for await (const response of finder.find()) {
      for (const so of response.saved_objects) {
        profiles.push(toProfile(so.id, so.attributes));
      }
    }
    await finder.close();
    return profiles;
  }

  async get(id: string): Promise<SandboxProfile | undefined> {
    try {
      const so = await this.soClient.get<SandboxProfileAttributes>(SANDBOX_PROFILE_SO_TYPE, id);
      return toProfile(so.id, so.attributes);
    } catch (err) {
      if (err?.output?.statusCode === 404) return undefined;
      throw err;
    }
  }

  /**
   * Update a profile. NEVER modifies encrypted (`secrets`) or AAD attributes via a
   * partial update (that would corrupt the ESO); those are stripped. When
   * `secrets` change, callers should recreate the profile (PoC constraint).
   */
  async update(id: string, request: SandboxProfileUpdateRequest): Promise<SandboxProfile> {
    const safe = omit(
      {
        name: request.name,
        description: request.description,
        connection: request.connection,
        runtime_config: request.runtimeConfig,
        policy: request.policy,
        updated_at: new Date().toISOString(),
      },
      [...SANDBOX_PROFILE_ATTRIBUTES_TO_ENCRYPT, ...SANDBOX_PROFILE_ATTRIBUTES_IN_AAD]
    );
    // Drop undefined so we don't overwrite existing values with undefined.
    const attributes = Object.fromEntries(
      Object.entries(safe).filter(([, v]) => v !== undefined)
    ) as Partial<SandboxProfileAttributes>;
    const so = await this.soClient.update<SandboxProfileAttributes>(
      SANDBOX_PROFILE_SO_TYPE,
      id,
      attributes
    );
    const merged = await this.get(id);
    if (!merged) throw new Error(`Sandbox profile ${id} not found after update`);
    this.logger.debug(`Updated sandbox profile ${so.id}`);
    return merged;
  }

  async delete(id: string): Promise<void> {
    await this.soClient.delete(SANDBOX_PROFILE_SO_TYPE, id);
  }

  /**
   * Internal-only: fetch a profile WITH its decrypted secrets, to build a
   * provider connection. Secrets must never be returned to the browser.
   */
  async getWithSecrets(
    id: string,
    { namespace }: { namespace?: string } = {}
  ): Promise<(SandboxProfile & { secrets: Record<string, string> }) | undefined> {
    try {
      const so = await this.encryptedSoClient.getDecryptedAsInternalUser<SandboxProfileAttributes>(
        SANDBOX_PROFILE_SO_TYPE,
        id,
        { namespace }
      );
      return { ...toProfile(so.id, so.attributes), secrets: so.attributes.secrets ?? {} };
    } catch (err) {
      if (err?.output?.statusCode === 404) return undefined;
      this.logger.warn(`Failed to decrypt sandbox profile ${id}: ${(err as Error).message}`);
      throw err;
    }
  }
}
