/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReturnTypeCreate, ReturnTypeUpdate, ReturnTypeAction } from '../../common/return_types';
import { Policy } from '../../common/types/domain_data';
import { PolicyAdapter } from './adapters/policy/memory_policy_adapter';

export class PoliciesLib {
  constructor(private readonly adapter: PolicyAdapter) {}

  /**
   * Get a policy by id
   * @param id
   */
  public async get(id: string): Promise<Policy | null> {
    return await this.adapter.get(id);
  }

  /** Get an array of all policies */
  public getAll = async (page: number, perPage: number, kuery?: string): Promise<any> => {
    return await this.adapter.getAll(page, perPage, kuery);
  };

  public create = async (policy: Partial<Policy>): Promise<ReturnTypeCreate<Policy>> => {
    return await this.adapter.create(policy);
  };

  public update = async (
    id: string,
    policy: Partial<Policy>
  ): Promise<ReturnTypeUpdate<Policy>> => {
    return await this.adapter.update(id, policy);
  };

  public getAgentStatus = async (policyId: string): Promise<ReturnTypeAction> => {
    return await this.adapter.getAgentStatus(policyId);
  };
}
