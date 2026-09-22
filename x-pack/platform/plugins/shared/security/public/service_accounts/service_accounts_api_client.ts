/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-browser';
import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-common';

// These directory types mirror the draft contract in #286880. Move them to the shared service
// account contract when that backend PR lands, so the browser client cannot drift from the route.
export type ServiceAccountDirectoryCreator = ServiceAccountWorkloadBinder & {
  displayName?: string;
};

export interface ServiceAccountDirectoryEntry {
  id: string;
  name: string;
  roles: string[];
  enabled: boolean;
  hasCredential: boolean;
  createdBy?: ServiceAccountDirectoryCreator;
  createdAt?: string;
}

export interface ListServiceAccountsResponse {
  serviceAccounts: ServiceAccountDirectoryEntry[];
  nextPage?: string;
}

export interface ListServiceAccountsParams {
  limit?: number;
  after?: string;
}

export class ServiceAccountsAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async create(params: CreateServiceAccountParams): Promise<ServiceAccount> {
    return await this.http.post<ServiceAccount>('/internal/security/service_account', {
      body: JSON.stringify(params),
    });
  }

  public async list(params: ListServiceAccountsParams = {}): Promise<ListServiceAccountsResponse> {
    return await this.http.get<ListServiceAccountsResponse>('/internal/security/service_account', {
      query: {
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
        ...(params.after !== undefined ? { after: params.after } : {}),
      },
    });
  }

  public async getAll(): Promise<ServiceAccountDirectoryEntry[]> {
    const serviceAccounts: ServiceAccountDirectoryEntry[] = [];
    const visitedCursors = new Set<string>();
    let after: string | undefined;

    do {
      const response = await this.list({ limit: 100, ...(after ? { after } : {}) });
      serviceAccounts.push(...response.serviceAccounts);
      after = response.nextPage;

      if (after && visitedCursors.has(after)) {
        throw new Error('Service account pagination returned a repeated cursor.');
      }
      if (after) {
        visitedCursors.add(after);
      }
    } while (after);

    return serviceAccounts;
  }
}
