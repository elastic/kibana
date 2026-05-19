/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ListOAuthClientsResponse } from '../../../common/http_api/oauth_clients';

const OAUTH_API_PATH = '/internal/security/oauth';

export class OAuthClientsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(): Promise<ListOAuthClientsResponse> {
    return await this.http.get<ListOAuthClientsResponse>(`${OAUTH_API_PATH}/clients`);
  }
}
