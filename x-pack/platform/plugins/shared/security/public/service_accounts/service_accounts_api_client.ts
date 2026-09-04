/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-browser';

export class ServiceAccountsAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async create(params: CreateServiceAccountParams): Promise<ServiceAccount> {
    return await this.http.post<ServiceAccount>('/internal/security/service_account', {
      body: JSON.stringify(params),
    });
  }
}
