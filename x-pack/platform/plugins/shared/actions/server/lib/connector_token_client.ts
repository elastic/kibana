/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import { SharedConnectorTokenClient } from './shared_connector_token_client';
import type { ConnectorToken, UserConnectorToken, UserConnectorOAuthToken } from '../types';
import { UserConnectorTokenClient } from './user_connector_token_client';

export const MAX_TOKENS_RETURNED = 1;

interface ConstructorOptions {
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

interface CreateOptions {
  profileUid?: string;
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
  profileUid?: string;
  connectorId: string;
  token: ConnectorToken | UserConnectorToken | null;
  newToken: string;
  expiresInSec?: number;
  tokenRequestDate: number;
  deleteExisting: boolean;
}

export class ConnectorTokenClient {
  private readonly logger: Logger;
  private readonly sharedClient: SharedConnectorTokenClient;
  private readonly userClient: UserConnectorTokenClient;

  constructor(options: ConstructorOptions) {
    this.logger = options.logger.get('connector_token_client');
    this.sharedClient = new SharedConnectorTokenClient(options);
    this.userClient = new UserConnectorTokenClient(options);
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

  private log({
    method,
    scope,
    fields,
  }: {
    method: string;
    scope: 'personal' | 'shared';
    fields: Record<string, string | boolean>;
  }): void {
    const parts = Object.entries(fields).map(([key, value]) =>
      typeof value === 'string' ? `${key}="${value}"` : `${key}=${value}`
    );
    this.logger.debug(`Delegating to ${scope} client: method=${method}, ${parts.join(', ')}`);
  }

  /**
   * Create new token for connector (delegates to shared or user client)
   */
  public async create(options: {
    connectorId: string;
    token: string;
    expiresAtMillis?: string;
    tokenType?: string;
  }): Promise<ConnectorToken>;
  public async create(options: {
    profileUid: string;
    connectorId: string;
    token?: string;
    credentials?: SavedObjectAttributes;
    expiresAtMillis?: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<UserConnectorToken>;
  public async create(options: CreateOptions): Promise<ConnectorToken | UserConnectorToken> {
    const scope = options.profileUid ? 'personal' : 'shared';
    this.log({ method: 'create', scope, fields: { connectorId: options.connectorId } });
    if (options.profileUid) {
      return this.userClient.create(options as Parameters<typeof this.userClient.create>[0]);
    }
    return this.sharedClient.create(options as Parameters<typeof this.sharedClient.create>[0]);
  }

  /**
   * Update connector token (delegates based on id prefix)
   */
  public async update(options: UpdateOptions): Promise<ConnectorToken | UserConnectorToken | null> {
    const { scope, actualId } = this.parseTokenId(options.id);
    this.log({ method: 'update', scope, fields: { id: actualId } });
    if (scope === 'personal') {
      return this.userClient.update({ ...options, id: actualId });
    }
    if (options.token) {
      return this.sharedClient.update({
        id: actualId,
        token: options.token,
        expiresAtMillis: options.expiresAtMillis,
        tokenType: options.tokenType,
      });
    }
    throw new Error('Token is required for shared connector token update');
  }

  /**
   * Get connector token (delegates to shared or user client)
   */
  public async get(options: {
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{ hasErrors: boolean; connectorToken: ConnectorToken | null }>;
  public async get(options: {
    profileUid: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{ hasErrors: boolean; connectorToken: UserConnectorToken | null }>;
  public async get(options: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: ConnectorToken | UserConnectorToken | null;
  }>;
  public async get(options: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: ConnectorToken | UserConnectorToken | null;
  }> {
    const scope = options.profileUid ? 'personal' : 'shared';
    this.log({ method: 'get', scope, fields: { connectorId: options.connectorId } });
    if (options.profileUid) {
      return this.userClient.get(options as Parameters<typeof this.userClient.get>[0]);
    }
    return this.sharedClient.get(options as Parameters<typeof this.sharedClient.get>[0]);
  }

  /**
   * Get OAuth personal token with parsed credentials
   */
  public async getOAuthPersonalToken(options: {
    profileUid: string;
    connectorId: string;
  }): Promise<{
    hasErrors: boolean;
    connectorToken: UserConnectorOAuthToken | null;
  }> {
    this.log({
      method: 'getOAuthPersonalToken',
      scope: 'personal',
      fields: { connectorId: options.connectorId },
    });
    return this.userClient.getOAuthPersonalToken(options);
  }

  /**
   * Delete all connector tokens (delegates to shared or user client)
   */
  public async deleteConnectorTokens(options: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
  }): Promise<void | unknown[]> {
    const scope = options.profileUid ? 'personal' : 'shared';
    this.log({
      method: 'deleteConnectorTokens',
      scope,
      fields: { connectorId: options.connectorId },
    });
    if (options.profileUid) {
      return this.userClient.deleteConnectorTokens(
        options as Parameters<typeof this.userClient.deleteConnectorTokens>[0]
      );
    }
    return this.sharedClient.deleteConnectorTokens(
      options as Parameters<typeof this.sharedClient.deleteConnectorTokens>[0]
    );
  }

  public async updateOrReplace(options: UpdateOrReplaceOptions) {
    const scope = options.profileUid ? 'personal' : 'shared';
    this.log({ method: 'updateOrReplace', scope, fields: { connectorId: options.connectorId } });
    if (options.profileUid) {
      return this.userClient.updateOrReplace(
        options as Parameters<typeof this.userClient.updateOrReplace>[0]
      );
    }
    return this.sharedClient.updateOrReplace(
      options as Parameters<typeof this.sharedClient.updateOrReplace>[0]
    );
  }

  /**
   * Create new token with refresh token support (delegates to shared or user client)
   */
  public async createWithRefreshToken(options: {
    profileUid?: string;
    connectorId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
    credentialType?: string;
  }): Promise<ConnectorToken | UserConnectorToken> {
    const scope = options.profileUid ? 'personal' : 'shared';
    this.log({
      method: 'createWithRefreshToken',
      scope,
      fields: { connectorId: options.connectorId },
    });
    if (options.profileUid) {
      return this.userClient.createWithRefreshToken(
        options as Parameters<typeof this.userClient.createWithRefreshToken>[0]
      );
    }
    return this.sharedClient.createWithRefreshToken(
      options as Parameters<typeof this.sharedClient.createWithRefreshToken>[0]
    );
  }

  /**
   * Update token with refresh token (delegates based on id prefix)
   */
  public async updateWithRefreshToken(options: {
    id: string;
    token: string;
    refreshToken?: string;
    expiresIn?: number;
    refreshTokenExpiresIn?: number;
    tokenType?: string;
    credentialType?: string;
  }): Promise<ConnectorToken | UserConnectorToken | null> {
    const { scope, actualId } = this.parseTokenId(options.id);
    this.log({ method: 'updateWithRefreshToken', scope, fields: { id: actualId } });
    if (scope === 'personal') {
      return this.userClient.updateWithRefreshToken({ ...options, id: actualId });
    }
    return this.sharedClient.updateWithRefreshToken({ ...options, id: actualId });
  }

  public getSharedCredentialsClient(): SharedConnectorTokenClient {
    return this.sharedClient;
  }

  public getUserCredentialsClient(): UserConnectorTokenClient {
    return this.userClient;
  }
}
