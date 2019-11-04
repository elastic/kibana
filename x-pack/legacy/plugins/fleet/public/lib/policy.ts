/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Policy } from '../../scripts/mock_spec/types';
import { PolicyAdapter } from './adapters/policy/memory_policy_adapter';

export class PoliciesLib {
  constructor(private readonly adapter: PolicyAdapter) {}

  /** Get an array of all policies */
  public getAll = async (): Promise<Policy[]> => {
    return await this.adapter.getAll();
  };
}
