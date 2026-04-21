/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  Logger,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  EXECUTION_IDENTITY_SO_TYPE,
  type ExecutionIdentity,
  type CreateExecutionIdentityRequest,
} from '../common/types';

export class ExecutionIdentityService {
  private coreStart?: CoreStart;
  private encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;

  constructor(private readonly logger: Logger) {}

  setStartServices(coreStart: CoreStart, encryptedSavedObjects: EncryptedSavedObjectsPluginStart) {
    this.coreStart = coreStart;
    this.encryptedSavedObjects = encryptedSavedObjects;
  }

  private getScopedSoClient(request: KibanaRequest): SavedObjectsClientContract {
    const { coreStart } = this.ensureStarted();
    return coreStart.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [EXECUTION_IDENTITY_SO_TYPE],
    });
  }

  private getInternalSoClient(): ReturnType<CoreStart['savedObjects']['createInternalRepository']> {
    const { coreStart } = this.ensureStarted();
    return coreStart.savedObjects.createInternalRepository([EXECUTION_IDENTITY_SO_TYPE]);
  }

  async create(
    request: KibanaRequest,
    params: CreateExecutionIdentityRequest
  ): Promise<ExecutionIdentity> {
    const { coreStart } = this.ensureStarted();

    const username = coreStart.security.authc.getCurrentUser(request)?.username ?? 'unknown';

    // PoC: use grantAsInternalUser to create the key on behalf of the requesting admin.
    // This means the key's limited_by = the admin's privilege snapshot.
    // For superuser admins, this is effectively a no-op (intersection = role_descriptors).
    // Long-term: ES needs a user-creatable service account primitive without limited_by.
    const apiKeyResponse = await coreStart.security.authc.apiKeys.grantAsInternalUser(request, {
      name: `execution-identity: ${params.name}`,
      role_descriptors: params.role_descriptors as Record<string, any>,
      metadata: {
        managed: true,
        application: 'execution-identity',
        identity_name: params.name,
      },
    });

    if (!apiKeyResponse) {
      throw new Error('Failed to create API key: API keys may not be enabled');
    }

    this.logger.info(
      `Created API key "${apiKeyResponse.id}" for execution identity "${params.name}"`
    );

    const apiKeyMaterial = `${apiKeyResponse.id}:${apiKeyResponse.api_key}`;
    const encodedApiKey = Buffer.from(apiKeyMaterial).toString('base64');

    // Use the scoped SO client (has ESO encryption wrappers) for writes
    const soClient = this.getScopedSoClient(request);
    const savedObject = await soClient.create(EXECUTION_IDENTITY_SO_TYPE, {
      name: params.name,
      description: params.description,
      role_descriptors: JSON.stringify(params.role_descriptors),
      api_key_id: apiKeyResponse.id,
      api_key: encodedApiKey,
      created_by: username,
      created_at: new Date().toISOString(),
    });

    return {
      id: savedObject.id,
      name: params.name,
      description: params.description,
      role_descriptors: params.role_descriptors,
      api_key_id: apiKeyResponse.id,
      created_by: username,
      created_at: savedObject.attributes.created_at as string,
    };
  }

  async list(): Promise<ExecutionIdentity[]> {
    const soClient = this.getInternalSoClient();
    const response = await soClient.find({
      type: EXECUTION_IDENTITY_SO_TYPE,
      perPage: 1000,
    });

    return response.saved_objects.map((so) => ({
      id: so.id,
      name: so.attributes.name as string,
      description: so.attributes.description as string,
      role_descriptors: JSON.parse(so.attributes.role_descriptors as string),
      api_key_id: so.attributes.api_key_id as string,
      created_by: so.attributes.created_by as string,
      created_at: so.attributes.created_at as string,
    }));
  }

  async get(id: string): Promise<ExecutionIdentity> {
    const soClient = this.getInternalSoClient();
    const so = await soClient.get(EXECUTION_IDENTITY_SO_TYPE, id);

    return {
      id: so.id,
      name: so.attributes.name as string,
      description: so.attributes.description as string,
      role_descriptors: JSON.parse(so.attributes.role_descriptors as string),
      api_key_id: so.attributes.api_key_id as string,
      created_by: so.attributes.created_by as string,
      created_at: so.attributes.created_at as string,
    };
  }

  async delete(id: string, request: KibanaRequest): Promise<void> {
    const { coreStart } = this.ensureStarted();

    const soClient = this.getInternalSoClient();
    const so = await soClient.get(EXECUTION_IDENTITY_SO_TYPE, id);
    const apiKeyId = so.attributes.api_key_id as string;

    if (apiKeyId) {
      try {
        const esClient = coreStart.elasticsearch.client.asInternalUser;
        await esClient.security.invalidateApiKey({ ids: [apiKeyId] });
        this.logger.info(`Invalidated API key "${apiKeyId}" for execution identity "${id}"`);
      } catch (err) {
        this.logger.warn(`Failed to invalidate API key "${apiKeyId}": ${err.message}`);
      }
    }

    // Use scoped client for delete (consistent with create)
    const scopedClient = this.getScopedSoClient(request);
    await scopedClient.delete(EXECUTION_IDENTITY_SO_TYPE, id);
  }

  async resolveIdentity(idOrName: string): Promise<{ apiKey: string; name: string }> {
    const { encryptedSavedObjects } = this.ensureStarted();

    this.logger.info(`[resolveIdentity] Resolving execution identity: "${idOrName}"`);

    const esoClient = encryptedSavedObjects.getClient({
      includedHiddenTypes: [EXECUTION_IDENTITY_SO_TYPE],
    });

    // First try direct lookup by saved object ID
    try {
      this.logger.debug(`[resolveIdentity] Attempting lookup by SO ID: "${idOrName}"`);
      const so = await esoClient.getDecryptedAsInternalUser(EXECUTION_IDENTITY_SO_TYPE, idOrName);
      this.logger.info(
        `[resolveIdentity] Found by ID. Name="${so.attributes.name}", apiKeyId="${so.attributes.api_key_id}"`
      );
      return {
        apiKey: so.attributes.api_key as string,
        name: so.attributes.name as string,
      };
    } catch (idErr) {
      this.logger.debug(
        `[resolveIdentity] Not found by ID ("${idOrName}"), trying name lookup. Error: ${
          (idErr as Error).message
        }`
      );
    }

    // Look up by name using internal repository (no decryption needed for find)
    const soClient = this.getInternalSoClient();
    this.logger.debug(`[resolveIdentity] Searching by name attribute: "${idOrName}"`);
    const found = await soClient.find({
      type: EXECUTION_IDENTITY_SO_TYPE,
      filter: `${EXECUTION_IDENTITY_SO_TYPE}.attributes.name: "${idOrName}"`,
      perPage: 1,
    });

    this.logger.info(
      `[resolveIdentity] Name search returned ${found.saved_objects.length} results for "${idOrName}"`
    );

    if (found.saved_objects.length === 0) {
      throw new Error(`Execution identity "${idOrName}" not found by ID or name`);
    }

    const soId = found.saved_objects[0].id;
    this.logger.info(`[resolveIdentity] Found by name. SO ID="${soId}", decrypting API key...`);
    const so = await esoClient.getDecryptedAsInternalUser(EXECUTION_IDENTITY_SO_TYPE, soId);
    this.logger.info(
      `[resolveIdentity] Decrypted successfully. Name="${so.attributes.name}", apiKeyId="${so.attributes.api_key_id}"`
    );
    return {
      apiKey: so.attributes.api_key as string,
      name: so.attributes.name as string,
    };
  }

  private ensureStarted(): {
    coreStart: CoreStart;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  } {
    if (!this.coreStart || !this.encryptedSavedObjects) {
      throw new Error('ExecutionIdentityService has not been started');
    }
    return {
      coreStart: this.coreStart,
      encryptedSavedObjects: this.encryptedSavedObjects,
    };
  }
}
