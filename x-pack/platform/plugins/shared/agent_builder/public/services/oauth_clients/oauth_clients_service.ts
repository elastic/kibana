/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type {
  CreateOAuthClientPayload,
  CreateOAuthClientResponse,
  GetOAuthClientResponse,
  ListOAuthClientsResponse,
  RevokeOAuthClientPayload,
  RevokeOAuthClientResponse,
} from '../../../common/http_api/oauth_clients';

const OAUTH_API_PATH = '/internal/security/oauth';

export class OAuthClientsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(): Promise<ListOAuthClientsResponse> {
    return await this.http.get<ListOAuthClientsResponse>(`${OAUTH_API_PATH}/clients`);
  }

  async get(clientId: string): Promise<GetOAuthClientResponse> {
    return await this.http.get<GetOAuthClientResponse>(
      buildPath(`${OAUTH_API_PATH}/clients/{clientId}`, { clientId })
    );
  }

  async create(payload: CreateOAuthClientPayload): Promise<CreateOAuthClientResponse> {
    return await this.http.post<CreateOAuthClientResponse>(`${OAUTH_API_PATH}/clients`, {
      body: JSON.stringify(payload),
    });
  }

  async revoke(
    clientId: string,
    payload?: RevokeOAuthClientPayload
  ): Promise<RevokeOAuthClientResponse> {
    return await this.http.post<RevokeOAuthClientResponse>(
      buildPath(`${OAUTH_API_PATH}/clients/{clientId}/_revoke`, { clientId }),
      { body: JSON.stringify(payload ?? {}) }
    );
  }
}
