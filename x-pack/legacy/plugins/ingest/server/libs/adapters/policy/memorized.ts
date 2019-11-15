/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memorize } from '@mattapperson/slapshot/lib/memorize';
import { StoredPolicy } from './adapter_types';
import { PolicyAdapter } from './default';
import { FrameworkUser } from '../framework/adapter_types';
import { ListOptions } from '../../../../../fleet/server/repositories/agents/types';

export class MemorizedPolicyAdapter {
  constructor(private readonly adapter?: PolicyAdapter) {}

  public async create(
    user: FrameworkUser,
    policy: StoredPolicy,
    options?: { id?: string }
  ): Promise<StoredPolicy> {
    return await memorize(
      `create - ${JSON.stringify({ name: policy.name, description: policy.description })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.create(user, policy, options);
      },
      {
        pure: false,
      }
    );
  }

  public async get(user: FrameworkUser, id: string): Promise<StoredPolicy | null> {
    return await memorize(
      `get - ${JSON.stringify(id)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.get(user, id);
      },
      {
        pure: false,
      }
    );
  }

  public async list(
    user: FrameworkUser,
    options: ListOptions = {}
  ): Promise<{ items: StoredPolicy[]; total: number }> {
    return await memorize(
      `list - ${JSON.stringify({ username: (user as any).username || user.kind, options })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.list(user, options);
      },
      {
        pure: false,
      }
    );
  }

  public async update(
    user: FrameworkUser,
    id: string,
    policy: StoredPolicy
  ): Promise<StoredPolicy> {
    return await memorize(
      `update - ${JSON.stringify({ name: policy.name, description: policy.description })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.update(user, id, policy);
      },
      {
        pure: false,
      }
    );
  }
}
