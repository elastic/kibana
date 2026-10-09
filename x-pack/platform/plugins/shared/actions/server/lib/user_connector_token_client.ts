/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import pLimit from 'p-limit';
import { z } from '@kbn/zod/v4';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { EARS_AUTH_ID } from '@kbn/connector-specs';
import { retryIfConflicts } from './retry_if_conflicts';
import { revokeEarsCredentials } from './ears/revoke_ears_credentials';
import type {
  UserConnectorToken,
  OAuthPersonalCredentials,
  UserConnectorOAuthToken,
} from '../types';
import {
  USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  ACTION_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import type { ActionsConfigurationUtilities } from '../actions_config';

export const MAX_TOKENS_RETURNED = 1;
const MAX_RETRY_ATTEMPTS = 3;
const REVOKE_CONCURRENCY = 10;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
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
  private readonly configurationUtilities: ActionsConfigurationUtilities;

  constructor({
    unsecuredSavedObjectsClient,
    encryptedSavedObjectsClient,
    logger,
    configurationUtilities,
  }: ConstructorOptions) {
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.configurationUtilities = configurationUtilities;
    this.logger = logger;
  }

  private parseTokenId(id: string): string {
    if (id.startsWith('per-user:')) {
      return id.substring(9);
    }
    if (id.startsWith('shared:')) {
      throw new Error(
        'UserConnectorTokenClient cannot handle shared-scope tokens. Use SharedConnectorTokenClient or ConnectorTokenClient instead.'
      );
    }
    // Default unprefixed IDs to per-user when called on user client
    return id;
  }

  private formatTokenId(rawId: string): string {
    return `per-user:${rawId}`;
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

  /**
   * Connector's OAuth authType/provider, decrypted from its secrets and config. Best-effort.
   */
  private async getOAuthConnectorAuthInfo(
    connectorId: string
  ): Promise<{ authType?: string; provider?: string }> {
    try {
      const decryptedAction = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<{
        config: { authType?: string };
        secrets: { authType?: string; provider?: string };
      }>(ACTION_SAVED_OBJECT_TYPE, connectorId, {
        namespace: this.unsecuredSavedObjectsClient.getCurrentNamespace(),
      });
      return {
        authType:
          decryptedAction.attributes.secrets.authType ||
          decryptedAction.attributes.config?.authType,
        provider: decryptedAction.attributes.secrets.provider,
      };
    } catch (err) {
      this.logger.error(
        `Failed to read OAuth configuration for connector "${connectorId}": ${err.message}`
      );
      return {};
    }
  }

  private parseOAuthPerUserCredentials(credentials: unknown): OAuthPersonalCredentials | null {
    const schema = z.object({
      accessToken: z.string().min(1),
      refreshToken: z.string().optional(),
    });

    const parsed = schema.safeParse(credentials);
    return parsed.success ? parsed.data : null;
  }

  /**
   * Create new per-user token for connector
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
      throw new Error('Per-user credentials are required to create a user connector token');
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
   * Update per-user connector token
   */
  public async update({
    id,
    token,
    credentials,
    expiresAtMillis,
    tokenType,
    credentialType,
  }: UpdateOptions): Promise<UserConnectorToken | null> {
    const actualId = this.parseTokenId(id);
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
          throw new Error('Per-user credentials are required to update a user connector token');
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

      return { ...result.attributes, id } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update user_connector_token for id "${id}" with ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Get per-user connector token
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

      const perUserToken = decrypted.attributes as UserConnectorToken;

      this.logger.debug(
        `Retrieved per-user credentials for ${context}, credentialKeys: ${Object.keys(
          perUserToken.credentials as Record<string, unknown>
        ).join(', ')}`
      );

      return {
        hasErrors: false,
        connectorToken: {
          id: this.formatTokenId(connectorTokensResult[0].id),
          ...perUserToken,
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
   * Get OAuth per-user token with parsed credentials
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
        `Expected per-user credentials for connectorId "${connectorId}", profileUid "${profileUid}".`
      );
      return { hasErrors: true, connectorToken: null };
    }

    // Verify credential type matches oauth before parsing
    if (connectorToken.credentialType !== 'oauth') {
      this.logger.error(
        `Expected OAuth credential type but found "${connectorToken.credentialType}" for connectorId "${connectorId}", profileUid "${profileUid}".`
      );
      return { hasErrors: true, connectorToken: null };
    }

    const parsedCredentials = this.parseOAuthPerUserCredentials(connectorToken.credentials);
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
   * Decrypted OAuth credentials for every user connected to a connector.
   */
  private async listOAuthTokensForConnector({
    connectorId,
  }: {
    connectorId: string;
  }): Promise<Array<{ profileUid: string; credentials: OAuthPersonalCredentials }>> {
    const context = this.getContextString(undefined, connectorId, 'oauth');
    const tokens: Array<{ profileUid: string; credentials: OAuthPersonalCredentials }> = [];

    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<UserConnectorToken>(
        {
          type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          perPage: 100,
          filter: `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}" AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.credentialType: "oauth"`,
        }
      );

    try {
      for await (const page of finder.find()) {
        for (const so of page.saved_objects) {
          const parsedCredentials = this.parseOAuthPerUserCredentials(so.attributes.credentials);
          if (!parsedCredentials) {
            this.logger.error(`Invalid OAuth credentials shape for ${context}, id "${so.id}".`);
            continue;
          }
          tokens.push({ profileUid: so.attributes.profileUid, credentials: parsedCredentials });
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to fetch/decrypt user_connector_token records for ${context}. Error: ${err.message}`
      );
    } finally {
      await finder.close();
    }

    return tokens;
  }

  /**
   * Revokes the EARS grant before deletion; called from deleteConnectorTokens so it can't be skipped.
   */
  private async revokeOAuthTokens({
    connectorId,
    profileUid,
    authType: suppliedAuthType,
    provider: suppliedProvider,
  }: {
    connectorId: string;
    profileUid?: string;
    authType?: string;
    provider?: string;
  }): Promise<void> {
    const { authType, provider } =
      suppliedAuthType !== undefined
        ? { authType: suppliedAuthType, provider: suppliedProvider }
        : await this.getOAuthConnectorAuthInfo(connectorId);

    if (authType === EARS_AUTH_ID && provider) {
      try {
        let credentialsList: Array<{ profileUid?: string; credentials: OAuthPersonalCredentials }>;
        if (profileUid) {
          const { connectorToken } = await this.getOAuthPersonalToken({ profileUid, connectorId });
          credentialsList = connectorToken
            ? [{ profileUid, credentials: connectorToken.credentials }]
            : [];
        } else {
          credentialsList = await this.listOAuthTokensForConnector({ connectorId });
        }

        const limit = pLimit(REVOKE_CONCURRENCY);
        const results = await Promise.allSettled(
          credentialsList.map(({ credentials }) =>
            limit(() =>
              revokeEarsCredentials({
                provider,
                credentials,
                configurationUtilities: this.configurationUtilities,
                logger: this.logger,
              })
            )
          )
        );

        for (const [i, result] of results.entries()) {
          if (result.status === 'rejected') {
            const tokenProfileUid = credentialsList[i].profileUid;
            const userContext = tokenProfileUid ? `, profileUid "${tokenProfileUid}"` : '';
            this.logger.error(
              `Failed to revoke EARS OAuth token for connectorId "${connectorId}"${userContext}: ${result.reason?.message}`
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to revoke EARS OAuth tokens for connectorId "${connectorId}": ${err.message}`
        );
      }
    } else if (authType && authType !== EARS_AUTH_ID) {
      this.logger.debug(
        `No revoke endpoint available for authType "${authType}"; skipping provider-side revocation for connectorId "${connectorId}".`
      );
    }
  }

  public async deleteConnectorTokens({
    profileUid,
    connectorId,
    tokenType,
    credentialType,
    authType,
    provider,
    skipRevocation = false,
  }: {
    profileUid: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
    authType?: string;
    provider?: string;
    skipRevocation?: boolean;
  }): Promise<void> {
    const context = this.getContextString(profileUid, connectorId);

    if (!skipRevocation) {
      await this.revokeOAuthTokens({ connectorId, profileUid, authType, provider });
    }

    const credentialTypeFilter = credentialType
      ? ` AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.credentialType: "${credentialType}"`
      : '';

    try {
      const result = await this.unsecuredSavedObjectsClient.find<UserConnectorToken>({
        type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        filter: `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.profileUid: "${profileUid}" AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${credentialTypeFilter}`,
      });
      await Promise.all(
        result.saved_objects.map((obj) =>
          this.unsecuredSavedObjectsClient.delete(USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE, obj.id)
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete user_connector_token records for ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }

  public async deleteAllConnectorTokens({
    connectorId,
    credentialType,
    authType,
    provider,
    skipRevocation = false,
  }: {
    connectorId: string;
    credentialType?: string;
    authType?: string;
    provider?: string;
    skipRevocation?: boolean;
  }): Promise<void> {
    const context = this.getContextString(undefined, connectorId);

    if (!skipRevocation) {
      await this.revokeOAuthTokens({ connectorId, authType, provider });
    }

    const credentialTypeFilter = credentialType
      ? ` AND ${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.credentialType: "${credentialType}"`
      : '';

    try {
      // Always re-fetch page 1: each bulk-delete shifts remaining records to the front.
      while (true) {
        const result = await this.unsecuredSavedObjectsClient.find<UserConnectorToken>({
          type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          filter: `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${credentialTypeFilter}`,
          perPage: 100,
          page: 1,
        });
        if (result.saved_objects.length === 0) break;
        const { statuses } = await this.unsecuredSavedObjectsClient.bulkDelete(
          result.saved_objects.map((obj) => ({
            type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
            id: obj.id,
          }))
        );
        const failed = statuses.filter((s) => !s.success);
        if (failed.length > 0) {
          this.logger.error(
            `Failed to delete ${
              failed.length
            } user_connector_token record(s) for ${context}: ${failed
              .map((s) => s.error?.message)
              .join(', ')}`
          );
        }
        // Stop if an entire page failed to delete; otherwise the next find() returns
        // the same records and the loop never terminates.
        if (failed.length === result.saved_objects.length) {
          throw new Error(
            `Failed to make progress deleting user_connector_token records for ${context}`
          );
        }
      }
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
  }: UpdateOrReplaceOptions): Promise<void> {
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
      const tokenId = token.id;
      if (tokenId == null || tokenId === '') {
        throw new Error(
          `Cannot update user connector token for connectorId "${connectorId}", profileUid "${profileUid}": token id is missing`
        );
      }
      await this.update({
        id: tokenId,
        token: newToken,
        expiresAtMillis: new Date(tokenRequestDate + expiresInSec * 1000).toISOString(),
        credentialType: 'oauth',
      });
    }
  }

  /**
   * Create new per-user token with refresh token support
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
      `Creating per-user token with credentials blob for profileUid: ${profileUid}, connectorId: ${connectorId}, credentialKeys: ${Object.keys(
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
   * Update per-user token with refresh token
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
    const actualId = this.parseTokenId(id);
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
        const resolvedRefreshToken = refreshToken ?? existingCreds.refreshToken;
        if (resolvedRefreshToken) {
          credentials.refreshToken = resolvedRefreshToken;
        }

        this.logger.debug(
          `Updating per-user token with refresh token for id: ${id}, credentialKeys: ${Object.keys(
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

      return { ...result.attributes, id } as UserConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update user_connector_token with refresh token for id "${id}" and ${context}. Error: ${err.message}`
      );
      throw err;
    }
  }
}
