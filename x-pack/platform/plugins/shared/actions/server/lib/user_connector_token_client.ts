/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import { z } from '@kbn/zod/v4';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { retryIfConflicts } from './retry_if_conflicts';
import type {
  UserConnectorToken,
  OAuthPersonalCredentials,
  UserConnectorOAuthToken,
} from '../types';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

export const MAX_TOKENS_RETURNED = 1;
const MAX_RETRY_ATTEMPTS = 3;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateOptions {
  profileUid: string;
  connectorId: string;
  token?: string;
  credentials?: SavedObjectAttributes;
  expiresAtMillis?: string;
  tokenType?: string;
  credentialType?: string;
}

export interface UpdateOptions {
  id: string;
  token?: string;
  credentials?: SavedObjectAttributes;
  expiresAtMillis?: string;
  tokenType?: string;
  credentialType?: string;
}

interface UpdateOrReplaceOptions {
  profileUid: string;
  connectorId: string;
  token: UserConnectorToken | null;
  newToken: string;
  expiresInSec?: number;
  tokenRequestDate: number;
  deleteExisting: boolean;
}

interface PersonalTokenAttributes {
  connectorId: string;
  profileUid: string;
  credentialType: string;
  credentials: SavedObjectAttributes;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class UserConnectorTokenClient {
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

  private parseTokenId(id: string): { scope: 'personal' | 'shared'; actualId: string } {
    if (id.startsWith('personal:')) {
      return { scope: 'personal', actualId: id.substring(9) };
    }
    if (id.startsWith('shared:')) {
      return { scope: 'shared', actualId: id.substring(7) };
    }
    return { scope: 'shared', actualId: id };
  }

  private formatTokenId(rawId: string): string {
    return `personal:${rawId}`;
  }

  private getContextString(
    profileUid?: string,
    connectorId?: string,
    credentialType?: string
  ): string {
    const parts = [];
    if (profileUid) parts.push(`profileUid "${profileUid}"`);
    if (connectorId) parts.push(`connectorId "${connectorId}"`);
    if (credentialType) parts.push(`credentialType: "${credentialType}"`);
    return parts.join(', ');
  }

  private parseOAuthPersonalCredentials(credentials: unknown): OAuthPersonalCredentials | null {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string().optional(),
    });

    const parsed = schema.safeParse(credentials);
    return parsed.success ? parsed.data : null;
  }

  /**
   * Create new personal token for connector
   */
  public async create({
    profileUid,
    connectorId,
    token,
    credentials,
    expiresAtMillis,
    tokenType,
    credentialType,
  }: CreateOptions): Promise<UserConnectorToken> {
    const rawId = SavedObjectsUtils.generateId();
    const createTime = Date.now();
    const resolvedCredentialType = credentialType ?? tokenType ?? 'oauth';

    const resolvedCredentials =
      credentials ?? (token ? { accessToken: token } : ({} as SavedObjectAttributes));

    if (Object.keys(resolvedCredentials).length === 0) {
      throw new Error('Personal credentials are required to create a user connector token');
    }

    const context = this.getContextString(profileUid, connectorId, resolvedCredentialType);

    const attributes: PersonalTokenAttributes = {
      connectorId,
      profileUid,
      credentialType: resolvedCredentialType,
      credentials: resolvedCredentials,
      expiresAt: expiresAtMillis,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
    };

    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        attributes,
        { id: rawId }
      );

      return {
        ...result.attributes,
        id: this.formatTokenId(rawId),
      } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to create user_connector_token for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Update personal connector token
   */
  public async update({
    id,
    token,
    credentials,
    expiresAtMillis,
    tokenType,
    credentialType,
  }: UpdateOptions): Promise<UserConnectorToken | null> {
    const { actualId } = this.parseTokenId(id);
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<UserConnectorToken>(
        USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        actualId
      );
    const createTime = Date.now();

    const existingAttrs = attributes as PersonalTokenAttributes;
    const profileUid = existingAttrs.profileUid;
    const context = this.getContextString(
      profileUid,
      existingAttrs.connectorId,
      credentialType ?? existingAttrs.credentialType
    );

    try {
      const updateOperation = () => {
        const { id: _id, ...attributesWithoutId } = attributes;
        const resolvedCredentialType =
          credentialType ?? (attributesWithoutId as PersonalTokenAttributes).credentialType;
        const resolvedCredentials =
          credentials ??
          (token
            ? { accessToken: token }
            : (attributesWithoutId as PersonalTokenAttributes).credentials);

        if (Object.keys(resolvedCredentials).length === 0) {
          throw new Error('Personal credentials are required to update a user connector token');
        }

        const updatedAttributes: PersonalTokenAttributes = {
          ...(attributesWithoutId as PersonalTokenAttributes),
          credentialType: resolvedCredentialType,
          credentials: resolvedCredentials,
          expiresAt: expiresAtMillis,
          updatedAt: new Date(createTime).toISOString(),
        };

        return this.unsecuredSavedObjectsClient.create<UserConnectorToken>(
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          updatedAttributes as UserConnectorToken,
          omitBy(
            {
              id: actualId,
              overwrite: true,
              references,
              version,
            },
            isUndefined
          )
        );
      };

      const result = await retryIfConflicts(
        this.logger,
        `userConnectorToken.update('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return { ...result.attributes, id: this.formatTokenId(actualId) } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update user_connector_token for id "${id}" with ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Get personal connector token
   */
  public async get({
    profileUid,
    connectorId,
    tokenType,
    credentialType,
  }: {
    profileUid: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: UserConnectorToken | null;
  }> {
    const contextCredentialType = credentialType ?? 'oauth';
    const context = this.getContextString(profileUid, connectorId, contextCredentialType);

    const credentialTypeFilter = credentialType
      ? ` AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.credentialType: "${credentialType}"`
      : '';

    const profileUidFilter = `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.profileUid: "${profileUid}" AND `;

    const connectorTokensResult = [];
    try {
      connectorTokensResult.push(
        ...(
          await this.unsecuredSavedObjectsClient.find<UserConnectorToken>({
            perPage: MAX_TOKENS_RETURNED,
            type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
            filter: `${profileUidFilter}${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${credentialTypeFilter}`,
            sortField: 'updated_at',
            sortOrder: 'desc',
          })
        ).saved_objects
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch user_connector_token for ${context}. Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }

    if (connectorTokensResult.length === 0) {
      return { hasErrors: false, connectorToken: null };
    }

    if (
      connectorTokensResult[0].attributes.expiresAt &&
      isNaN(Date.parse(connectorTokensResult[0].attributes.expiresAt))
    ) {
      this.logger.error(
        `Failed to get user_connector_token for ${context}. Error: expiresAt is not a valid Date "${connectorTokensResult[0].attributes.expiresAt}"`
      );
      return { hasErrors: true, connectorToken: null };
    }

    try {
      const decrypted =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<UserConnectorToken>(
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          connectorTokensResult[0].id
        );

      const personalToken = decrypted.attributes as UserConnectorToken;

      this.logger.debug(
        `Retrieved personal credentials for ${context}, credentialKeys: ${Object.keys(
          personalToken.credentials as Record<string, unknown>
        ).join(', ')}`
      );

      return {
        hasErrors: false,
        connectorToken: {
          id: this.formatTokenId(connectorTokensResult[0].id),
          ...personalToken,
        },
      };
    } catch (err) {
      this.logger.error(
        `Failed to decrypt user_connector_token for ${context}. Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }
  }

  /**
   * Get OAuth personal token with parsed credentials
   */
  public async getOAuthPersonalToken({
    profileUid,
    connectorId,
  }: {
    profileUid: string;
    connectorId: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: UserConnectorOAuthToken | null;
  }> {
    const { connectorToken, hasErrors } = await this.get({
      profileUid,
      connectorId,
      credentialType: 'oauth',
    });

    if (hasErrors || !connectorToken) {
      return { hasErrors, connectorToken: null };
    }

    if (!('credentials' in connectorToken)) {
      this.logger.error(
        `Expected personal credentials for connectorId "${connectorId}", profileUid "${profileUid}".`
      );
      return { hasErrors: true, connectorToken: null };
    }

    const parsedCredentials = this.parseOAuthPersonalCredentials(connectorToken.credentials);
    if (!parsedCredentials) {
      this.logger.error(
        `Invalid OAuth credentials shape for connectorId "${connectorId}", profileUid "${profileUid}".`
      );
      return { hasErrors: true, connectorToken: null };
    }

    return {
      hasErrors: false,
      connectorToken: {
        ...connectorToken,
        credentialType: 'oauth',
        credentials: parsedCredentials,
      },
    };
  }

  /**
   * Delete all personal connector tokens
   */
  public async deleteConnectorTokens({
    profileUid,
    connectorId,
    tokenType,
    credentialType,
  }: {
    profileUid: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }) {
    const context = this.getContextString(profileUid, connectorId);

    const credentialTypeFilter = credentialType
      ? ` AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.credentialType: "${credentialType}"`
      : '';

    const profileUidFilter = `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.profileUid: "${profileUid}" AND `;

    try {
      const result = await this.unsecuredSavedObjectsClient.find<UserConnectorToken>({
        type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        filter: `${profileUidFilter}${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${credentialTypeFilter}`,
      });
      return Promise.all(
        result.saved_objects.map(
          async (obj) =>
            await this.unsecuredSavedObjectsClient.delete(
              USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
              obj.id
            )
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete user_connector_token records for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  public async updateOrReplace({
    profileUid,
    connectorId,
    token,
    newToken,
    expiresInSec,
    tokenRequestDate,
    deleteExisting,
  }: UpdateOrReplaceOptions) {
    expiresInSec = expiresInSec ?? 3600;
    tokenRequestDate = tokenRequestDate ?? Date.now();
    if (token === null) {
      if (deleteExisting) {
        await this.deleteConnectorTokens({
          profileUid,
          connectorId,
          credentialType: 'oauth',
        });
      }

      await this.create({
        profileUid,
        connectorId,
        token: newToken,
        expiresAtMillis: new Date(tokenRequestDate + expiresInSec * 1000).toISOString(),
        credentialType: 'oauth',
      });
    } else {
      await this.update({
        id: token.id!,
        token: newToken,
        expiresAtMillis: new Date(tokenRequestDate + expiresInSec * 1000).toISOString(),
        credentialType: 'oauth',
      });
    }
  }

  /**
   * Create new personal token with refresh token support
   */
  public async createWithRefreshToken({
    profileUid,
    connectorId,
    accessToken,
    refreshToken,
    expiresIn,
    refreshTokenExpiresIn,
    tokenType,
    credentialType,
  }: {
    profileUid: string;
    connectorId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
    credentialType?: string;
  }): Promise<UserConnectorToken> {
    const rawId = SavedObjectsUtils.generateId();
    const now = Date.now();
    const expiresInMillis = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;
    const refreshTokenExpiresInMillis = refreshTokenExpiresIn
      ? new Date(now + refreshTokenExpiresIn * 1000).toISOString()
      : undefined;

    const resolvedCredentialType = credentialType ?? 'oauth';
    const context = this.getContextString(profileUid, connectorId);

    const credentials: Record<string, string> = {
      accessToken,
    };
    if (refreshToken) {
      credentials.refreshToken = refreshToken;
    }

    this.logger.debug(
      `Creating personal token with credentials blob for profileUid: ${profileUid}, connectorId: ${connectorId}, credentialKeys: ${Object.keys(
        credentials
      ).join(', ')}`
    );

    const attributes: PersonalTokenAttributes = {
      connectorId,
      profileUid,
      credentialType: resolvedCredentialType,
      credentials,
      expiresAt: expiresInMillis,
      refreshTokenExpiresAt: refreshTokenExpiresInMillis,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };

    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        attributes,
        { id: rawId }
      );

      this.logger.debug(
        `Successfully created user_connector_token with refresh token for ${context}, id: ${this.formatTokenId(
          rawId
        )}`
      );

      return { ...result.attributes, id: this.formatTokenId(rawId) } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to create user_connector_token with refresh token for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Update personal token with refresh token
   */
  public async updateWithRefreshToken({
    id,
    token,
    refreshToken,
    expiresIn,
    refreshTokenExpiresIn,
    tokenType,
    credentialType,
  }: {
    id: string;
    token: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
    credentialType?: string;
  }): Promise<UserConnectorToken | null> {
    const { actualId } = this.parseTokenId(id);
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<UserConnectorToken>(
        USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        actualId
      );

    const now = Date.now();
    const expiresInMillis = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;
    const refreshTokenExpiresInMillis = refreshTokenExpiresIn
      ? new Date(now + refreshTokenExpiresIn * 1000).toISOString()
      : undefined;

    const profileUid =
      'profileUid' in attributes && typeof attributes.profileUid === 'string'
        ? attributes.profileUid
        : undefined;
    const context = this.getContextString(profileUid, attributes.connectorId);

    try {
      const updateOperation = () => {
        const { id: _id, ...attributesWithoutId } = attributes;
        const existingCreds =
          ((attributesWithoutId as PersonalTokenAttributes).credentials as Record<
            string,
            string | undefined
          >) || {};
        const existingAttrs = attributesWithoutId as PersonalTokenAttributes;

        const credentials: Record<string, string> = {
          accessToken: token,
        };
        if (refreshToken ?? existingCreds.refreshToken) {
          credentials.refreshToken = refreshToken ?? existingCreds.refreshToken!;
        }

        this.logger.debug(
          `Updating personal token with refresh token for id: ${id}, credentialKeys: ${Object.keys(
            credentials
          ).join(', ')}`
        );

        const updatedAttributes: PersonalTokenAttributes = {
          ...attributesWithoutId,
          credentialType:
            credentialType ?? (attributesWithoutId as PersonalTokenAttributes).credentialType,
          credentials,
          expiresAt: expiresInMillis,
          refreshTokenExpiresAt: refreshTokenExpiresInMillis ?? existingAttrs.refreshTokenExpiresAt,
          updatedAt: new Date(now).toISOString(),
        };

        return this.unsecuredSavedObjectsClient.create<UserConnectorToken>(
          USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          updatedAttributes as UserConnectorToken,
          omitBy(
            {
              id: actualId,
              overwrite: true,
              references,
              version,
            },
            isUndefined
          )
        );
      };

      const result = await retryIfConflicts(
        this.logger,
        `userConnectorToken.updateWithRefreshToken('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return { ...result.attributes, id: this.formatTokenId(actualId) } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update user_connector_token with refresh token for id "${id}" and ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }
}
