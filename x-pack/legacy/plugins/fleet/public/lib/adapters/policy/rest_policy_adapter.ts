/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Policy } from '../../../../scripts/mock_spec/types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { PolicyAdapter } from './memory_policy_adapter';

const POLICIES_SERVER_HOST = `${window.location.protocol}//${window.location.hostname}:4010`;

export class RestPolicyAdapter extends PolicyAdapter {
  constructor(private readonly REST: RestAPIAdapter) {
    super([]);
  }

  public async get(id: string): Promise<Policy | null> {
    try {
      return await this.REST.get<Policy>(`${POLICIES_SERVER_HOST}/policy/${id}`);
    } catch (e) {
      return null;
    }
  }

  public async getAll() {
    try {
      return await this.REST.get<Policy[]>(`${POLICIES_SERVER_HOST}/policies`);
    } catch (e) {
      return [];
    }
  }
}
