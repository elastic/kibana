/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyAdapter, FullPolicyFile } from './adapters/policy/adapter_type';

export class PolicyLib {
  constructor(private readonly policyAdapter: PolicyAdapter) {}

  public async getFullPolicy(policyId: string): Promise<FullPolicyFile> {
    return await this.policyAdapter.getFullPolicy(policyId);
  }
}
