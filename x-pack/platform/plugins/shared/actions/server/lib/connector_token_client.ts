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
  ConnectorToken,
  OAuthPersonalCredentials,
  UserConnectorOAuthToken,
  UserConnectorToken,
} from '../types';
import {
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';

export const MAX_TOKENS_RETURNED = 1;
const MAX_RETRY_ATTEMPTS = 3;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateOptions {
  profileUid?: string;
  connectorId: string;
  token?: string;
  expiresAtMillis?: string;
  tokenType?: string;
  credentialType?: string;
  credentials?: SavedObjectAttributes;
}

export interface UpdateOptions {
  id: string;
  token?: string;
  expiresAtMillis?: string;
  tokenType?: string;
  credentialType?: string;
  credentials?: SavedObjectAttributes;
}

interface UpdateOrReplaceOptions {
  profileUid?: string;
  connectorId: string;
  token: ConnectorToken | UserConnectorToken | null;
  newToken: string;
  expiresInSec?: number;
  tokenRequestDate: number;
  deleteExisting: boolean;
}

type TokenType = ConnectorToken | UserConnectorToken;

interface SharedTokenAttributes {
  connectorId: string;
  token: string;
  expiresAt?: string;
  tokenType: string;
  createdAt: string;
  updatedAt: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
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

export class ConnectorTokenClient {
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

  private getSavedObjectType(profileUid?: string): string {
    return profileUid ? USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE : CONNECTOR_TOKEN_SAVED_OBJECT_TYPE;
  }

  private parseTokenId(id: string): {
    scope: 'personal' | 'shared';
    actualId: string;
  } {
    if (id.startsWith('personal:')) {
      return { scope: 'personal', actualId: id.substring(9) };
    }
    if (id.startsWith('shared:')) {
      return { scope: 'shared', actualId: id.substring(7) };
    }
    return { scope: 'shared', actualId: id };
  }

  private formatTokenId(rawId: string, scope: 'personal' | 'shared'): string {
    return `${scope}:${rawId}`;
  }

  // Creates a descriptive context string for logging
  private getContextString(profileUid?: string, connectorId?: string, tokenType?: string): string {
    const parts = [];
    if (profileUid) parts.push(`profileUid "${profileUid}"`);
    if (connectorId) parts.push(`connectorId "${connectorId}"`);
    if (tokenType) parts.push(`tokenType: "${tokenType}"`);
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
   * Create new token for connector
   */
  public async create({
    profileUid,
    connectorId,
    token,
    expiresAtMillis,
    tokenType,
    credentialType,
    credentials,
  }: CreateOptions): Promise<TokenType> {
    const rawId = SavedObjectsUtils.generateId();
    const scope = profileUid ? 'personal' : 'shared';
    const id = this.formatTokenId(rawId, scope);
    const createTime = Date.now();
    const savedObjectType = this.getSavedObjectType(profileUid);
    const contextTokenType = profileUid
      ? credentialType ?? tokenType ?? 'oauth'
      : tokenType ?? 'access_token';
    const context = this.getContextString(profileUid, connectorId, contextTokenType);

    try {
      let attributes: SharedTokenAttributes | PersonalTokenAttributes;

      if (profileUid) {
        const resolvedCredentialType = credentialType ?? tokenType ?? 'oauth';
        const resolvedCredentials =
          credentials ?? (token ? { accessToken: token } : ({} as SavedObjectAttributes));
        if (Object.keys(resolvedCredentials).length === 0) {
          throw new Error('Personal credentials are required to create a user connector token');
        }

        attributes = {
          connectorId,
          profileUid,
          credentialType: resolvedCredentialType,
          credentials: resolvedCredentials,
          expiresAt: expiresAtMillis,
          createdAt: new Date(createTime).toISOString(),
          updatedAt: new Date(createTime).toISOString(),
        };
      } else {
        if (!token) {
          throw new Error('Token is required to create a shared connector token');
        }
        attributes = {
          connectorId,
          token,
          expiresAt: expiresAtMillis,
          tokenType: tokenType ?? 'access_token',
          createdAt: new Date(createTime).toISOString(),
          updatedAt: new Date(createTime).toISOString(),
        };
      }

      const result = await this.unsecuredSavedObjectsClient.create(savedObjectType, attributes, {
        id: rawId,
      });

      return { ...result.attributes, id } as TokenType;
    } catch (err) {
      this.logger.error(
        `Failed to create ${savedObjectType} for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Update connector token
   */
  public async update({
    id,
    token,
    expiresAtMillis,
    tokenType,
    credentialType,
    credentials,
  }: UpdateOptions): Promise<TokenType | null> {
    const { scope, actualId } = this.parseTokenId(id);
    const savedObjectType =
      scope === 'personal'
        ? USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE
        : CONNECTOR_TOKEN_SAVED_OBJECT_TYPE;

    let attributes: TokenType;
    let references: unknown[];
    let version: string | undefined;

    try {
      const tokenResult = await this.unsecuredSavedObjectsClient.get<TokenType>(
        savedObjectType,
        actualId
      );
      attributes = tokenResult.attributes;
      references = tokenResult.references;
      version = tokenResult.version;
    } catch (err) {
      this.logger.error(`Failed to find token with id "${id}". Error: ${err.message}`);
      throw err;
    }

    const createTime = Date.now();
    const profileUid =
      'profileUid' in attributes && typeof attributes.profileUid === 'string'
        ? attributes.profileUid
        : undefined;
    const contextTokenType = profileUid
      ? credentialType ??
        (attributes as PersonalTokenAttributes).credentialType ??
        tokenType ??
        'oauth'
      : tokenType ?? 'access_token';
    const context = this.getContextString(profileUid, attributes.connectorId, contextTokenType);

    try {
      const updateOperation = () => {
        // Exclude id from attributes since it's saved object metadata, not document data
        const { id: _id, ...attributesWithoutId } = attributes;

        let updatedAttributes: SharedTokenAttributes | PersonalTokenAttributes;

        if (scope === 'personal' && 'credentials' in attributesWithoutId) {
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

          updatedAttributes = {
            ...attributesWithoutId,
            credentialType: resolvedCredentialType,
            credentials: resolvedCredentials,
            expiresAt: expiresAtMillis,
            updatedAt: new Date(createTime).toISOString(),
          } as PersonalTokenAttributes;
        } else {
          if (!token) {
            throw new Error('Token is required to update a shared connector token');
          }
          updatedAttributes = {
            ...(attributesWithoutId as SharedTokenAttributes),
            token,
            expiresAt: expiresAtMillis,
            tokenType: tokenType ?? 'access_token',
            updatedAt: new Date(createTime).toISOString(),
          };
        }

        return this.unsecuredSavedObjectsClient.create<TokenType>(
          savedObjectType,
          updatedAttributes as TokenType,
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
        `connectorToken.update('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return { ...result.attributes, id } as TokenType;
    } catch (err) {
      this.logger.error(
        `Failed to update ${savedObjectType} for id "${id}" with ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Get connector token
   */
  public async get({
    profileUid,
    connectorId,
    tokenType,
    credentialType,
  }: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: TokenType | null;
  }> {
    const connectorTokensResult = [];
    const savedObjectType = this.getSavedObjectType(profileUid);
    const contextTokenType = profileUid ? credentialType ?? 'oauth' : tokenType ?? 'access_token';
    const context = this.getContextString(profileUid, connectorId, contextTokenType);

    const fieldName = profileUid ? 'credentialType' : 'tokenType';
    const tokenFilterValue = profileUid ? credentialType ?? 'oauth' : tokenType;
    const tokenTypeFilter = tokenFilterValue
      ? ` AND ${savedObjectType}.attributes.${fieldName}: "${tokenFilterValue}"`
      : '';

    const profileUidFilter = profileUid
      ? `${savedObjectType}.attributes.profileUid: "${profileUid}" AND `
      : '';

    try {
      connectorTokensResult.push(
        ...(
          await this.unsecuredSavedObjectsClient.find<TokenType>({
            perPage: MAX_TOKENS_RETURNED,
            type: savedObjectType,
            filter: `${profileUidFilter}${savedObjectType}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
            sortField: 'updated_at',
            sortOrder: 'desc',
          })
        ).saved_objects
      );
    } catch (err) {
      this.logger.error(`Failed to fetch ${savedObjectType} for ${context}. Error: ${err.message}`);
      return { hasErrors: true, connectorToken: null };
    }

    if (connectorTokensResult.length === 0) {
      return { hasErrors: false, connectorToken: null };
    }

    try {
      const decrypted =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<TokenType>(
          savedObjectType,
          connectorTokensResult[0].id
        );

      if (
        connectorTokensResult[0].attributes.expiresAt &&
        isNaN(Date.parse(connectorTokensResult[0].attributes.expiresAt))
      ) {
        this.logger.error(
          `Failed to get ${savedObjectType} for ${context}. Error: expiresAt is not a valid Date "${connectorTokensResult[0].attributes.expiresAt}"`
        );
        return { hasErrors: true, connectorToken: null };
      }

      if (profileUid) {
        const personalToken = decrypted.attributes as UserConnectorToken;

        this.logger.debug(
          `Retrieved personal credentials for ${context}, credentialKeys: ${Object.keys(
            personalToken.credentials as Record<string, unknown>
          ).join(', ')}`
        );

        return {
          hasErrors: false,
          connectorToken: {
            id: this.formatTokenId(connectorTokensResult[0].id, 'personal'),
            ...personalToken,
          },
        };
      }

      const sharedToken = {
        ...(connectorTokensResult[0].attributes as ConnectorToken),
        ...(decrypted.attributes as ConnectorToken),
      };
      return {
        hasErrors: false,
        connectorToken: {
          id: this.formatTokenId(connectorTokensResult[0].id, 'shared'),
          ...sharedToken,
        },
      };
    } catch (err) {
      this.logger.error(
        `Failed to decrypt ${savedObjectType} for ${context}. Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }
  }

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
   * Delete all connector tokens
   */
  public async deleteConnectorTokens({
    profileUid,
    connectorId,
    tokenType,
    credentialType,
  }: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }) {
    const savedObjectType = this.getSavedObjectType(profileUid);
    const context = this.getContextString(profileUid, connectorId);

    const fieldName = profileUid ? 'credentialType' : 'tokenType';
    const tokenFilterValue = profileUid ? credentialType : tokenType;
    const tokenTypeFilter = tokenFilterValue
      ? ` AND ${savedObjectType}.attributes.${fieldName}: "${tokenFilterValue}"`
      : '';

    const profileUidFilter = profileUid
      ? `${savedObjectType}.attributes.profileUid: "${profileUid}" AND `
      : '';

    try {
      const result = await this.unsecuredSavedObjectsClient.find<TokenType>({
        type: savedObjectType,
        filter: `${profileUidFilter}${savedObjectType}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
      });
      return Promise.all(
        result.saved_objects.map(
          async (obj) => await this.unsecuredSavedObjectsClient.delete(savedObjectType, obj.id)
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete ${savedObjectType} records for ${context}. Error: ${err.message}`
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
          tokenType: 'access_token',
        });
      }

      await this.create({
        profileUid,
        connectorId,
        token: newToken,
        expiresAtMillis: new Date(tokenRequestDate + expiresInSec * 1000).toISOString(),
        tokenType: 'access_token',
      });
    } else {
      await this.update({
        id: token.id!,
        token: newToken,
        expiresAtMillis: new Date(tokenRequestDate + expiresInSec * 1000).toISOString(),
        tokenType: 'access_token',
      });
    }
  }

  /**
   * Create new token with refresh token support
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
    profileUid?: string;
    connectorId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
    credentialType?: string;
  }): Promise<TokenType> {
    const rawId = SavedObjectsUtils.generateId();
    const scope = profileUid ? 'personal' : 'shared';
    const id = this.formatTokenId(rawId, scope);
    const now = Date.now();
    const expiresInMillis = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;
    const refreshTokenExpiresInMillis = refreshTokenExpiresIn
      ? new Date(now + refreshTokenExpiresIn * 1000).toISOString()
      : undefined;

    const savedObjectType = this.getSavedObjectType(profileUid);
    const context = this.getContextString(profileUid, connectorId);

    try {
      let attributes: SharedTokenAttributes | PersonalTokenAttributes;

      if (profileUid) {
        const resolvedCredentialType = credentialType ?? 'oauth';
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

        attributes = {
          connectorId,
          profileUid,
          credentialType: resolvedCredentialType,
          credentials,
          expiresAt: expiresInMillis,
          refreshTokenExpiresAt: refreshTokenExpiresInMillis,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        };
      } else {
        const sharedAttrs = omitBy(
          {
            connectorId,
            token: accessToken,
            refreshToken,
            expiresAt: expiresInMillis,
            refreshTokenExpiresAt: refreshTokenExpiresInMillis,
            tokenType: tokenType ?? 'access_token',
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
          },
          isUndefined
        );
        attributes = sharedAttrs as unknown as SharedTokenAttributes;
      }

      const result = await this.unsecuredSavedObjectsClient.create(savedObjectType, attributes, {
        id: rawId,
      });

      this.logger.debug(
        `Successfully created ${savedObjectType} with refresh token for ${context}, id: ${id}`
      );

      return { ...result.attributes, id } as TokenType;
    } catch (err) {
      this.logger.error(
        `Failed to create ${savedObjectType} with refresh token for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Update token with refresh token
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
  }): Promise<TokenType | null> {
    const { scope, actualId } = this.parseTokenId(id);
    const savedObjectType =
      scope === 'personal'
        ? USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE
        : CONNECTOR_TOKEN_SAVED_OBJECT_TYPE;

    let attributes: TokenType;
    let references: unknown[];
    let version: string | undefined;

    try {
      const tokenResult = await this.unsecuredSavedObjectsClient.get<TokenType>(
        savedObjectType,
        actualId
      );
      attributes = tokenResult.attributes;
      references = tokenResult.references;
      version = tokenResult.version;
    } catch (err) {
      this.logger.error(`Failed to find token with id "${id}". Error: ${err.message}`);
      throw err;
    }

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
        // Exclude id from attributes since it's saved object metadata, not document data
        const { id: _id, ...attributesWithoutId } = attributes;

        let updatedAttributes: SharedTokenAttributes | PersonalTokenAttributes;

        if (scope === 'personal' && 'credentials' in attributesWithoutId) {
          const existingCreds =
            (attributesWithoutId.credentials as Record<string, string | undefined>) || {};
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

          updatedAttributes = {
            ...attributesWithoutId,
            credentialType:
              credentialType ?? (attributesWithoutId as PersonalTokenAttributes).credentialType,
            credentials,
            expiresAt: expiresInMillis,
            refreshTokenExpiresAt:
              refreshTokenExpiresInMillis ?? existingAttrs.refreshTokenExpiresAt,
            updatedAt: new Date(now).toISOString(),
          } as PersonalTokenAttributes;
        } else {
          const sharedAttrs = attributesWithoutId as SharedTokenAttributes;
          const updated = omitBy(
            {
              ...sharedAttrs,
              token,
              refreshToken: refreshToken ?? sharedAttrs.refreshToken,
              expiresAt: expiresInMillis,
              refreshTokenExpiresAt:
                refreshTokenExpiresInMillis ?? sharedAttrs.refreshTokenExpiresAt,
              tokenType: tokenType ?? sharedAttrs.tokenType ?? 'access_token',
              updatedAt: new Date(now).toISOString(),
            },
            isUndefined
          );
          updatedAttributes = updated as unknown as SharedTokenAttributes;
        }

        return this.unsecuredSavedObjectsClient.create<TokenType>(
          savedObjectType,
          updatedAttributes as TokenType,
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
        `connectorToken.updateWithRefreshToken('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return { ...result.attributes, id } as TokenType;
    } catch (err) {
      this.logger.error(
        `Failed to update ${savedObjectType} with refresh token for id "${id}" and ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }
}
