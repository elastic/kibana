/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { Logger, SavedObjectsClientContract, SavedObjectAttributes } from '@kbn/core/server';
import { SharedConnectorTokenClient } from './shared_connector_token_client';
import type { ConnectorToken, UserConnectorToken } from '../types';
import { UserConnectorTokenClient } from './user_connector_token_client';

export const MAX_TOKENS_RETURNED = 1;

const PER_USER_TOKEN_PREFIX = 'per-user:';
const SHARED_TOKEN_PREFIX = 'shared:';

const PER_USER_TOKEN_SCOPE = 'per-user' as const;
const SHARED_TOKEN_SCOPE = 'shared' as const;

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

  private getScope(
    profileUid?: string,
    authMode?: typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE
  ): typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE {
    return profileUid || (authMode && authMode === PER_USER_TOKEN_SCOPE)
      ? PER_USER_TOKEN_SCOPE
      : SHARED_TOKEN_SCOPE;
  }

  private parseTokenId(id: string): {
    scope: typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE;
    actualId: string;
  } {
    if (id.startsWith(PER_USER_TOKEN_PREFIX)) {
      return { scope: PER_USER_TOKEN_SCOPE, actualId: id.substring(PER_USER_TOKEN_PREFIX.length) };
    }
    if (id.startsWith(SHARED_TOKEN_PREFIX)) {
      return { scope: SHARED_TOKEN_SCOPE, actualId: id.substring(SHARED_TOKEN_PREFIX.length) };
    }
    // Default unprefixed IDs to shared for backward compatibility
    return { scope: SHARED_TOKEN_SCOPE, actualId: id };
  }

  private log({
    method,
    scope,
    fields,
  }: {
    method: string;
    scope: typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE;
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
    const scope = this.getScope(options.profileUid);
    this.log({ method: 'create', scope, fields: { connectorId: options.connectorId } });
    if (scope === PER_USER_TOKEN_SCOPE) {
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
    if (scope === PER_USER_TOKEN_SCOPE) {
      return this.userClient.update(options);
    }
    if (options.token) {
      return this.sharedClient.update({
        id: options.id,
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
    const scope = this.getScope(options.profileUid);
    this.log({ method: 'get', scope, fields: { connectorId: options.connectorId } });
    if (scope === PER_USER_TOKEN_SCOPE) {
      return this.userClient.get(options as Parameters<typeof this.userClient.get>[0]);
    }
    return this.sharedClient.get(options as Parameters<typeof this.sharedClient.get>[0]);
  }

  /**
   * Delete all connector tokens (delegates to shared or user client)
   */
  public async deleteConnectorTokens(options: {
    profileUid?: string;
    connectorId: string;
    tokenType?: string;
    credentialType?: string;
    authMode?: typeof PER_USER_TOKEN_SCOPE | typeof SHARED_TOKEN_SCOPE;
  }): Promise<void> {
    const scope = this.getScope(options.profileUid, options.authMode);
    this.log({
      method: 'deleteConnectorTokens',
      scope,
      fields: { connectorId: options.connectorId },
    });
    if (scope === PER_USER_TOKEN_SCOPE) {
      return this.userClient.deleteConnectorTokens(
        options as Parameters<typeof this.userClient.deleteConnectorTokens>[0]
      );
    }
    return this.sharedClient.deleteConnectorTokens(
      options as Parameters<typeof this.sharedClient.deleteConnectorTokens>[0]
    );
  }

  public async updateOrReplace(options: UpdateOrReplaceOptions) {
    const scope = this.getScope(options.profileUid);
    this.log({ method: 'updateOrReplace', scope, fields: { connectorId: options.connectorId } });
    if (scope === PER_USER_TOKEN_SCOPE) {
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
    const scope = this.getScope(options.profileUid);
    this.log({
      method: 'createWithRefreshToken',
      scope,
      fields: { connectorId: options.connectorId },
    });
    if (scope === PER_USER_TOKEN_SCOPE) {
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
    if (scope === PER_USER_TOKEN_SCOPE) {
      return this.userClient.updateWithRefreshToken(options);
    }
    return this.sharedClient.updateWithRefreshToken(options);
  }
}
