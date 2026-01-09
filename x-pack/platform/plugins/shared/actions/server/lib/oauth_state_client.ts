/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { omitBy, isUndefined } from 'lodash';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { OAUTH_STATE_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

const STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

export interface OAuthState {
  id?: string;
  state: string;
  codeVerifier: string;
  connectorId: string;
  redirectUri: string;
  authorizationUrl: string;
  scope?: string;
  kibanaReturnUrl: string;
  createdAt: string;
  expiresAt: string;
  createdBy?: string;
}

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateStateOptions {
  connectorId: string;
  redirectUri: string;
  authorizationUrl: string;
  scope?: string;
  kibanaReturnUrl: string;
  createdBy?: string;
}

/**
 * Generates a cryptographically secure random string for OAuth2 state/verifier
 */
function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generates PKCE code challenge from code verifier
 */
function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

export class OAuthStateClient {
  private readonly logger: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
  }: ConstructorOptions) {
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.logger = logger;
  }

  /**
   * Create new OAuth state with PKCE parameters
   */
  public async create({
    connectorId,
    redirectUri,
    authorizationUrl,
    scope,
    kibanaReturnUrl,
    createdBy,
  }: CreateStateOptions): Promise<{
    state: OAuthState;
    codeChallenge: string;
  }> {
    const id = SavedObjectsUtils.generateId();
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(128); // PKCE spec recommends 43-128 chars
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STATE_EXPIRATION_MS);

    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        OAUTH_STATE_SAVED_OBJECT_TYPE,
        omitBy(
          {
            state,
            codeVerifier,
            connectorId,
            redirectUri,
            authorizationUrl,
            scope,
            kibanaReturnUrl,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            createdBy,
          },
          isUndefined
        ),
        { id }
      );

      return {
        state: {
          id: result.id,
          ...result.attributes,
        } as OAuthState,
        codeChallenge,
      };
    } catch (err) {
      this.logger.error(
        `Failed to create OAuth state for connectorId "${connectorId}". Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Get and validate OAuth state by state parameter
   */
  public async get(stateParam: string): Promise<OAuthState | null> {
    try {
      const result = await this.unsecuredSavedObjectsClient.find<OAuthState>({
        type: OAUTH_STATE_SAVED_OBJECT_TYPE,
        filter: `${OAUTH_STATE_SAVED_OBJECT_TYPE}.attributes.state: "${stateParam}"`,
        perPage: 1,
      });

      if (result.saved_objects.length === 0) {
        this.logger.warn(`OAuth state not found for state parameter: ${stateParam}`);
        return null;
      }

      const stateObject = result.saved_objects[0];

      // Check if expired
      if (new Date(stateObject.attributes.expiresAt) < new Date()) {
        this.logger.warn(`OAuth state expired for state parameter: ${stateParam}`);
        await this.delete(stateObject.id);
        return null;
      }

      // Decrypt code verifier
      const decrypted =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<OAuthState>(
          OAUTH_STATE_SAVED_OBJECT_TYPE,
          stateObject.id
        );

      return {
        id: stateObject.id,
        ...decrypted.attributes,
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch OAuth state for state parameter "${stateParam}". Error: ${err.message}`
      );
      return null;
    }
  }

  /**
   * Delete OAuth state (should be called after a successful token exchange)
   */
  public async delete(id: string): Promise<void> {
    try {
      await this.unsecuredSavedObjectsClient.delete(OAUTH_STATE_SAVED_OBJECT_TYPE, id);
    } catch (err) {
      this.logger.error(`Failed to delete OAuth state "${id}". Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Clean up expired OAuth states (called periodically by task manager)
   */
  public async cleanupExpiredStates(): Promise<number> {
    try {
      const finder = this.unsecuredSavedObjectsClient.createPointInTimeFinder<OAuthState>({
        type: OAUTH_STATE_SAVED_OBJECT_TYPE,
        filter: `${OAUTH_STATE_SAVED_OBJECT_TYPE}.attributes.expiresAt < "${new Date().toISOString()}"`,
        perPage: 100,
      });

      let totalDeleted = 0;

      for await (const response of finder.find()) {
        await this.unsecuredSavedObjectsClient.bulkDelete(
          response.saved_objects.map((obj) => ({
            type: OAUTH_STATE_SAVED_OBJECT_TYPE,
            id: obj.id,
          }))
        );

        totalDeleted += response.saved_objects.length;
      }

      await finder.close();

      this.logger.debug(`Cleaned up ${totalDeleted} expired OAuth states`);
      return totalDeleted;
    } catch (err) {
      this.logger.error(`Failed to cleanup expired OAuth states. Error: ${err.message}`);
      return 0;
    }
  }
}
