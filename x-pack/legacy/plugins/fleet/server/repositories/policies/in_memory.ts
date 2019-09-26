/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PoliciesRepository as PoliciesRepositoryType, FullPolicyFile } from './types';

/**
 * In memory policy Adapter (for test purpose only!)
 */
export class InMemoryPoliciesRepository implements PoliciesRepositoryType {
  public policies: { [k: string]: FullPolicyFile } = {};

  async getFullPolicy(id: string) {
    return this.policies[id];
  }
}
