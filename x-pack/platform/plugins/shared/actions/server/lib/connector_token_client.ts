/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { retryIfConflicts } from './retry_if_conflicts';
import type { ConnectorToken } from '../types';
import { CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

export const MAX_TOKENS_RETURNED = 1;
const MAX_RETRY_ATTEMPTS = 3;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateOptions {
  connectorId: string;
  token: string;
  expiresAtMillis?: string;
  tokenType?: string;
}

export interface UpdateOptions {
  id: string;
  token: string;
  expiresAtMillis?: string;
  tokenType?: string;
}

interface UpdateOrReplaceOptions {
  connectorId: string;
  token: ConnectorToken | null;
  newToken: string;
  expiresInSec?: number;
  tokenRequestDate: number;
  deleteExisting: boolean;
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

  /**
   * Create new token for connector
   */
  public async create({
    connectorId,
    token,
    expiresAtMillis,
    tokenType,
  }: CreateOptions): Promise<ConnectorToken> {
    const id = SavedObjectsUtils.generateId();
    const createTime = Date.now();
    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        {
          connectorId,
          token,
          expiresAt: expiresAtMillis,
          tokenType: tokenType ?? 'access_token',
          createdAt: new Date(createTime).toISOString(),
          updatedAt: new Date(createTime).toISOString(),
        },
        { id }
      );

      return result.attributes as ConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to create connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
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
  }: UpdateOptions): Promise<ConnectorToken | null> {
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        id
      );
    const createTime = Date.now();

    try {
      const updateOperation = () => {
        // Exclude id from attributes since it's saved object metadata, not document data
        const { id: _id, ...attributesWithoutId } = attributes;
        return this.unsecuredSavedObjectsClient.create<ConnectorToken>(
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          {
            ...attributesWithoutId,
            token,
            expiresAt: expiresAtMillis,
            tokenType: tokenType ?? 'access_token',
            updatedAt: new Date(createTime).toISOString(),
          },
          omitBy(
            {
              id,
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
        `accessToken.create('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return result.attributes as ConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update connector_token for id "${id}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      throw err;
    }
  }

  /**
   * Get connector token
   */
  public async get({
    connectorId,
    tokenType,
  }: {
    connectorId: string;
    tokenType?: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: ConnectorToken | null;
  }> {
    const connectorTokensResult = [];
    const tokenTypeFilter = tokenType
      ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
      : '';

    try {
      connectorTokensResult.push(
        ...(
          await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
            perPage: MAX_TOKENS_RETURNED,
            type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
            filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
            sortField: 'updated_at',
            sortOrder: 'desc',
          })
        ).saved_objects
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }

    if (connectorTokensResult.length === 0) {
      return { hasErrors: false, connectorToken: null };
    }

    let accessToken: string;
    try {
      const {
        attributes: { token },
      } = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        connectorTokensResult[0].id
      );

      accessToken = token;
    } catch (err) {
      this.logger.error(
        `Failed to decrypt connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: ${err.message}`
      );
      return { hasErrors: true, connectorToken: null };
    }

    if (
      connectorTokensResult[0].attributes.expiresAt &&
      isNaN(Date.parse(connectorTokensResult[0].attributes.expiresAt))
    ) {
      this.logger.error(
        `Failed to get connector_token for connectorId "${connectorId}" and tokenType: "${
          tokenType ?? 'access_token'
        }". Error: expiresAt is not a valid Date "${connectorTokensResult[0].attributes.expiresAt}"`
      );
      return { hasErrors: true, connectorToken: null };
    }

    return {
      hasErrors: false,
      connectorToken: {
        id: connectorTokensResult[0].id,
        ...connectorTokensResult[0].attributes,
        token: accessToken,
      },
    };
  }

  /**
   * Delete all connector tokens
   */
  public async deleteConnectorTokens({
    connectorId,
    tokenType,
  }: {
    connectorId: string;
    tokenType?: string;
  }) {
    const tokenTypeFilter = tokenType
      ? ` AND ${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.tokenType: "${tokenType}"`
      : '';
    try {
      const result = await this.unsecuredSavedObjectsClient.find<ConnectorToken>({
        type: CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        filter: `${CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.connectorId: "${connectorId}"${tokenTypeFilter}`,
      });
      return Promise.all(
        result.saved_objects.map(
          async (obj) =>
            await this.unsecuredSavedObjectsClient.delete(CONNECTOR_TOKEN_SAVED_OBJECT_TYPE, obj.id)
        )
      );
    } catch (err) {
      this.logger.error(
        `Failed to delete connector_token records for connectorId "${connectorId}". Error: ${err.message}`
      );
      throw err;
    }
  }

  public async updateOrReplace({
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
          connectorId,
          tokenType: 'access_token',
        });
      }

      await this.create({
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
    connectorId,
    accessToken,
    refreshToken,
    expiresIn,
    refreshTokenExpiresIn,
    tokenType,
  }: {
    connectorId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
  }): Promise<ConnectorToken> {
    const id = SavedObjectsUtils.generateId();
    const now = Date.now();
    const expiresInMillis = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;
    const refreshTokenExpiresInMillis = refreshTokenExpiresIn
      ? new Date(now + refreshTokenExpiresIn * 1000).toISOString()
      : undefined;

    try {
      const result = await this.unsecuredSavedObjectsClient.create(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        omitBy(
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
        ),
        { id }
      );

      return result.attributes as ConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to create connector_token with refresh token for connectorId "${connectorId}". Error: ${err.message}`
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
  }: {
    id: string;
    token: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
  }): Promise<ConnectorToken | null> {
    const { attributes, references, version } =
      await this.unsecuredSavedObjectsClient.get<ConnectorToken>(
        CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        id
      );
    const now = Date.now();
    const expiresInMillis = expiresIn ? new Date(now + expiresIn * 1000).toISOString() : undefined;
    const refreshTokenExpiresInMillis = refreshTokenExpiresIn
      ? new Date(now + refreshTokenExpiresIn * 1000).toISOString()
      : undefined;

    try {
      const updateOperation = () => {
        // Exclude id from attributes since it's saved object metadata, not document data
        const { id: _id, ...attributesWithoutId } = attributes;
        return this.unsecuredSavedObjectsClient.create<ConnectorToken>(
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          omitBy(
            {
              ...attributesWithoutId,
              token,
              refreshToken: refreshToken ?? attributes.refreshToken,
              expiresAt: expiresInMillis,
              refreshTokenExpiresAt:
                refreshTokenExpiresInMillis ?? attributes.refreshTokenExpiresAt,
              tokenType: tokenType ?? 'access_token',
              updatedAt: new Date(now).toISOString(),
            },
            isUndefined
          ) as ConnectorToken,
          omitBy(
            {
              id,
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
        `accessToken.updateWithRefreshToken('${id}')`,
        updateOperation,
        MAX_RETRY_ATTEMPTS
      );

      return result.attributes as ConnectorToken;
    } catch (err) {
      this.logger.error(
        `Failed to update connector_token with refresh token for id "${id}". Error: ${err.message}`
      );
      throw err;
    }
  }
}
