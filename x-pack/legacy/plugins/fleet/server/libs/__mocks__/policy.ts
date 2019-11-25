/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentPolicy } from '../../repositories/policies/types';

/**
 * Mocked policy lib for test purpropse
 */
export class PolicyLib {
  public async getFullPolicy(_user: any, policyId: string): Promise<AgentPolicy> {
    return {
      id: policyId,
      outputs: {},
      streams: [],
      name: 'Policy 1',
      updated_by: 'johndoe',
      updated_on: '2019-09-23T20:46:42+0000',
      version: 0,
      created_by: 'johndoe',
      created_on: '2019-09-23T20:46:42+0000',
    } as AgentPolicy;
  }
}
