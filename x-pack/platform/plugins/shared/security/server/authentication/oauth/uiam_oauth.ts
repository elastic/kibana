/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import type {
  CreateUiamOAuthClientParams,
  UiamOAuthClientResponse,
  UiamOAuthConnectionResponse,
  UiamOAuthType,
  UpdateUiamOAuthClientParams,
  UpdateUiamOAuthConnectionParams,
} from '@kbn/core-security-server';

import type { SecurityLicense } from '../../../common';
import { getDetailedErrorMessage } from '../../errors';
import type { UiamServicePublic } from '../../uiam';

export interface UiamOAuthOptions {
  logger: Logger;
  license: SecurityLicense;
  uiam: UiamServicePublic;
}

export class UiamOAuth implements UiamOAuthType {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;

  constructor({ logger, license, uiam }: UiamOAuthOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
  }

  async createClient(
    request: KibanaRequest,
    params: CreateUiamOAuthClientParams
  ): Promise<UiamOAuthClientResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug('Attempting to create an OAuth client');

    try {
      const result = await this.uiam.createOAuthClient(accessToken, params);
      this.logger.debug(`OAuth client created successfully with id ${result.id}`);
      return result;
    } catch (e) {
      this.logger.error(`Failed to create OAuth client: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async listClients(
    request: KibanaRequest,
    clientId?: string
  ): Promise<{ clients: UiamOAuthClientResponse[] } | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug('Attempting to list OAuth clients');

    try {
      const result = await this.uiam.listOAuthClients(accessToken, clientId);
      this.logger.debug('OAuth clients listed successfully');
      return result;
    } catch (e) {
      this.logger.error(`Failed to list OAuth clients: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async updateClient(
    request: KibanaRequest,
    clientId: string,
    params: UpdateUiamOAuthClientParams
  ): Promise<UiamOAuthClientResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug(`Attempting to update OAuth client ${clientId}`);

    try {
      const result = await this.uiam.updateOAuthClient(accessToken, clientId, params);
      this.logger.debug(`OAuth client ${clientId} updated successfully`);
      return result;
    } catch (e) {
      this.logger.error(`Failed to update OAuth client ${clientId}: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async revokeClient(
    request: KibanaRequest,
    clientId: string,
    reason?: string
  ): Promise<UiamOAuthClientResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug(`Attempting to revoke OAuth client ${clientId}`);

    try {
      const result = await this.uiam.revokeOAuthClient(accessToken, clientId, reason);
      this.logger.debug(`OAuth client ${clientId} revoked successfully`);
      return result;
    } catch (e) {
      this.logger.error(`Failed to revoke OAuth client ${clientId}: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async listConnections(
    request: KibanaRequest,
    clientId?: string,
    connectionId?: string
  ): Promise<{ connections: UiamOAuthConnectionResponse[] } | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug('Attempting to list OAuth connections');

    try {
      const result = await this.uiam.listOAuthConnections(accessToken, clientId, connectionId);
      this.logger.debug('OAuth connections listed successfully');
      return result;
    } catch (e) {
      this.logger.error(`Failed to list OAuth connections: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async updateConnection(
    request: KibanaRequest,
    clientId: string,
    connectionId: string,
    params: UpdateUiamOAuthConnectionParams
  ): Promise<UiamOAuthConnectionResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug(`Attempting to update OAuth connection ${connectionId}`);

    try {
      const result = await this.uiam.updateOAuthConnection(
        accessToken,
        clientId,
        connectionId,
        params
      );
      this.logger.debug(`OAuth connection ${connectionId} updated successfully`);
      return result;
    } catch (e) {
      this.logger.error(
        `Failed to update OAuth connection ${connectionId}: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }
  }

  async revokeConnection(
    request: KibanaRequest,
    clientId: string,
    connectionId: string,
    reason?: string
  ): Promise<UiamOAuthConnectionResponse | null> {
    if (!this.license.isEnabled()) {
      return null;
    }

    const accessToken = UiamOAuth.getAccessToken(request);
    this.logger.debug(`Attempting to revoke OAuth connection ${connectionId}`);

    try {
      const result = await this.uiam.revokeOAuthConnection(
        accessToken,
        clientId,
        connectionId,
        reason
      );
      this.logger.debug(`OAuth connection ${connectionId} revoked successfully`);
      return result;
    } catch (e) {
      this.logger.error(
        `Failed to revoke OAuth connection ${connectionId}: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }
  }

  /**
   * Extracts the Bearer access token from the request. The token must be a UIAM credential.
   */
  static getAccessToken(request: KibanaRequest): string {
    const authorization = HTTPAuthorizationHeader.parseFromRequest(request);

    if (!authorization) {
      throw Boom.unauthorized('Request does not contain an authorization header');
    }

    if (!isUiamCredential(authorization)) {
      throw Boom.badRequest('Provided credential is not compatible with UIAM');
    }

    return authorization.credentials;
  }
}
