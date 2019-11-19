/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { SODatabaseAdapter } from '../so_database/default';
import { StoredPolicy, RuntimeStoredPolicy } from './adapter_types';
import { ListOptions } from '../../../../../fleet/server/repositories/agents/types';
import { FrameworkUser } from '../framework/adapter_types';

export class PolicyAdapter {
  constructor(private readonly so: SODatabaseAdapter) {}

  public async create(
    user: FrameworkUser,
    policy: StoredPolicy,
    options?: { id?: string }
  ): Promise<StoredPolicy> {
    const newSo = await this.so.create<any>(
      user,
      'policies',
      (policy as any) as StoredPolicy,
      options
    );

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(user: FrameworkUser, id: string): Promise<StoredPolicy | null> {
    const policySO = await this.so.get<any>(user, 'policies', id);
    if (!policySO) {
      return null;
    }

    if (policySO.error) {
      throw new Error(policySO.error.message);
    }

    const policy = {
      id: policySO.id,
      ...policySO.attributes,
    };

    const decoded = RuntimeStoredPolicy.decode(policy);

    if (isRight(decoded)) {
      return decoded.right;
    } else {
      throw new Error(
        `Invalid Policy data. == ${JSON.stringify(policy)} -- ${PathReporter.report(decoded)}`
      );
    }
  }

  public async list(
    user: FrameworkUser,
    options: ListOptions = {}
  ): Promise<{ items: StoredPolicy[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;
    const filters = [];

    if (kuery && kuery !== '') {
      filters.push(kuery.replace(/policies\./g, 'policies.attributes.'));
    }

    const policies = await this.so.find<any>(user, {
      type: 'policies',
      page,
      perPage,
      filter: _joinFilters(filters),
    });

    const storedPolicies = policies.saved_objects.map<StoredPolicy>(policySO => {
      const policy = {
        id: policySO.id,
        ...policySO.attributes,
      };
      const decoded = RuntimeStoredPolicy.decode(policy);

      if (isRight(decoded)) {
        return decoded.right;
      } else {
        throw new Error(
          `Invalid PolicyFile data. == ${JSON.stringify(policy)}  -- ${PathReporter.report(
            decoded
          )}`
        );
      }
    });
    return {
      items: [...storedPolicies.values()],
      total: policies.total,
      page,
      perPage,
    };
  }

  // public async listVersions(
  //   sharedID: string,
  //   activeOnly = true,
  //   page: number = 1,
  //   perPage: number = 25
  // ): Promise<PolicyFile[]> {
  //   const policies = (await this.so.find<any>({
  //     type: 'policies',
  //     search: sharedID,
  //     searchFields: ['shared_id'],
  //     page,
  //     perPage,
  //   })).saved_objects;

  //   if (!activeOnly) {
  //     const backupPolicies = await this.so.find<BackupPolicyFile>({
  //       type: 'backup_policies',
  //       search: sharedID,
  //       searchFields: ['shared_id'],
  //     });
  //     policies.concat(backupPolicies.saved_objects);
  //   }

  //   return policies.map<PolicyFile>(policySO => {
  //     const policy = {
  //       id: policySO.id,
  //       ...policySO.attributes,
  //     };
  //     const decoded = RuntimePolicyFile.decode(policy);
  //     if (isRight(decoded)) {
  //       return decoded.right;
  //     } else {
  //       throw new Error(`Invalid PolicyFile data. == ${policy}`);
  //     }
  //   });
  // }

  public async update(
    user: FrameworkUser,
    id: string,
    policy: StoredPolicy
  ): Promise<StoredPolicy> {
    await this.so.update<StoredPolicy>(user, 'policies', id, policy);

    return policy;
  }

  // public async getBackup(id: string): Promise<BackupPolicyFile> {
  //   const policy = await this.so.get<BackupPolicyFile>('backup_policies', id);

  //   if (policy.error) {
  //     throw new Error(policy.error.message);
  //   }

  //   if (!policy.attributes) {
  //     throw new Error(`No backup policy found with ID of ${id}`);
  //   }
  //   if (isRight(RuntimePolicyFile.decode(policy.attributes))) {
  //     return policy.attributes as BackupPolicyFile;
  //   } else {
  //     throw new Error(`Invalid BackupPolicyFile data. == ${policy.attributes}`);
  //   }
  // }
}
function _joinFilters(filters: string[], operator = 'AND') {
  return filters.reduce((acc: string | undefined, filter) => {
    if (acc) {
      return `${acc} ${operator} (${filter})`;
    }

    return `(${filter})`;
  }, undefined);
}
