/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Policy } from '../adapters/policy/adapter_type';

/**
 * Mocked policy lib for test purpropse
 */
export class PolicyLib {
  public async getFullPolicy(policyId: string): Promise<Policy> {
    return { id: policyId };
  }
}
