/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ReturnTypeList,
  ReturnTypeCreate,
  ReturnTypeGet,
  ReturnTypeUpdate,
  ReturnTypeAction,
} from '../../../../common/return_types';
import { Policy } from '../../../../common/types/domain_data';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { PolicyAdapter } from './memory_policy_adapter';

export class RestPolicyAdapter extends PolicyAdapter {
  constructor(private readonly REST: RestAPIAdapter) {
    super([]);
  }

  public async get(id: string): Promise<Policy | null> {
    try {
      return (await this.REST.get<ReturnTypeGet<Policy>>(`/api/ingest/policies/${id}`)).item;
    } catch (e) {
      return null;
    }
  }

  public async getAll(page: number, perPage: number, kuery?: string) {
    try {
      return await this.REST.get<ReturnTypeList<Policy>>(`/api/ingest/policies`, {
        query: {
          page,
          perPage,
          kuery: kuery !== '' ? kuery : undefined,
        },
      });
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

  public async create(policy: Partial<Policy>) {
    return await this.REST.post<ReturnTypeCreate<Policy>>(`/api/ingest/policies`, { body: policy });
  }

  public async update(id: string, policy: Partial<Policy>) {
    return await this.REST.put<ReturnTypeUpdate<Policy>>(`/api/ingest/policies/${id}`, {
      body: policy,
    });
  }

  public async getAgentStatus(policyId: string) {
    return await this.REST.get<ReturnTypeAction>(`/api/fleet/policy/${policyId}/agent-status`);
  }
}
