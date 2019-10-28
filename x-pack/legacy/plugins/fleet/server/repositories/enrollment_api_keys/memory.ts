/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { EnrollmentApiKey, EnrollmentApiKeysRepository } from './types';
import { FrameworkUser } from '../../adapters/framework/adapter_types';

/**
 * MemoryAdapter for persisting enrollmentApiKeys, for tests purposes only.
 */
export class MemoryEnrollmentApiKeysRepository implements EnrollmentApiKeysRepository {
  public keys: { [k: string]: EnrollmentApiKey } = {};
  private keyId = 1;
  public async create(
    user: FrameworkUser,
    {
      apiKey,
      apiKeyId,
      active,
      policyId,
      expire_at,
      name,
    }: {
      apiKey: string;
      apiKeyId: string;
      active: boolean;
      policyId?: string;
      expire_at?: string;
      name?: string;
    }
  ): Promise<EnrollmentApiKey> {
    const id = `enrollment-api-keys-${this.keyId++}`;
    this.keys[id] = {
      id,
      active,
      created_at: moment().toISOString(),
      api_key: apiKey,
      api_key_id: apiKeyId,
      expire_at,
      policy_id: policyId,
      enrollment_rules: [],
      name,
    };

    return this.keys[id];
  }

  public async list(
    user: FrameworkUser<any>,
    options: {
      page?: number;
      perPage?: number;
      kuery?: string;
      showInactive?: boolean;
    }
  ): Promise<{ items: EnrollmentApiKey[]; total: any; page: any; perPage: any }> {
    const { page = 1, perPage = 20 } = options;

    const keys = Object.values(this.keys);
    const start = (page - 1) * perPage;
    const items = keys.slice(start, start + perPage);
    const total = items.length;

    return {
      items,
      total,
      page,
      perPage,
    };
  }

  public async getByApiKeyId(
    user: FrameworkUser,
    apiKeyId: string
  ): Promise<EnrollmentApiKey | null> {
    return Object.values(this.keys).find(t => t.api_key_id === apiKeyId) || null;
  }

  public async update(
    user: FrameworkUser,
    id: string,
    newData: Partial<EnrollmentApiKey>
  ): Promise<void> {
    const key = this.keys[id];

    Object.assign(key, newData);
  }

  public async getById(user: FrameworkUser, id: string) {
    return Object.values(this.keys).find(t => t.id === id) || null;
  }

  public async delete(user: FrameworkUser, id: string): Promise<void> {
    delete this.keys[id];
  }
}
