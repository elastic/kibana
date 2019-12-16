/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ReturnTypeList,
  ReturnTypeGet,
  ReturnTypeCreate,
  ReturnTypeDelete,
} from '../../common/return_types';
import { RestAPIAdapter } from './adapters/rest_api/adapter_types';
import { EnrollmentApiKey } from '../../common/types/domain_data';
import { Pagination } from '../hooks';

export class EnrollmentApiKeyLib {
  constructor(private readonly rest: RestAPIAdapter) {}

  public async listKeys(pagination: Pagination) {
    return await this.rest.get<ReturnTypeList<EnrollmentApiKey>>('/api/fleet/enrollment-api-keys', {
      query: {
        page: pagination.currentPage,
        perPage: pagination.pageSize,
      },
    });
  }

  public async get(keyId: string) {
    return await this.rest.get<ReturnTypeGet<EnrollmentApiKey>>(
      `/api/fleet/enrollment-api-keys/${keyId}`
    );
  }

  public async delete(keyId: string) {
    return await this.rest.delete<ReturnTypeDelete>(`/api/fleet/enrollment-api-keys/${keyId}`);
  }

  public async create(data: { name: string; policyId: string }) {
    return await this.rest.post<ReturnTypeCreate<EnrollmentApiKey>>(
      `/api/fleet/enrollment-api-keys`,
      {
        body: {
          name: data.name,
          policy_id: data.policyId,
        },
      }
    );
  }
}
