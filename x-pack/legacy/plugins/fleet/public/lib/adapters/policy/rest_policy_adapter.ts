/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReturnTypeList } from '../../../../common/return_types';
import { Policy } from '../../../../scripts/mock_spec/types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { PolicyAdapter } from './memory_policy_adapter';

export class RestPolicyAdapter extends PolicyAdapter {
  constructor(private readonly REST: RestAPIAdapter) {
    super([]);
  }

  public async get(id: string): Promise<Policy | null> {
    try {
      return await this.REST.get<Policy>(`/api/ingest/policy/${id}`);
    } catch (e) {
      return null;
    }
  }

  public async getAll(page: number, perPage: number, kuery?: string) {
    try {
      return await this.REST.get<ReturnTypeList<Policy>>(`/api/ingest/policies`);
    } catch (e) {
      return {
        list: [],
        success: false,
        page,
        total: 0,
        perPage,
      };
    }
  }
}
