/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { SODatabaseAdapter } from '../so_database/default';
import { RuntimePolicyFile, NewPolicyFile } from './adapter_types';

import { PolicyFile, DatasourceInput, BackupPolicyFile } from './adapter_types';

export class PolicyAdapter {
  constructor(private readonly so: SODatabaseAdapter) {}

  public async create(
    policy: NewPolicyFile
  ): Promise<{ id: string; shared_id: string; version: number }> {
    const newSo = await this.so.create<PolicyFile>('policies', (policy as any) as PolicyFile);

    return {
      id: newSo.id,
      shared_id: newSo.attributes.shared_id,
      version: newSo.attributes.version,
    };
  }

  public async get(id: string): Promise<PolicyFile> {
    const policySO = await this.so.get<PolicyFile>('policies', id);

    if (policySO.error) {
      throw new Error(policySO.error.message);
    }

    const policy = {
      id: policySO.id,
      ...policySO.attributes,
    };

    const decoded = RuntimePolicyFile.decode(policy);

    if (decoded.isRight()) {
      return policy as PolicyFile;
    } else {
      throw new Error(
        `Invalid PolicyFile data. == ${JSON.stringify(policy)} -- ${PathReporter.report(decoded)}`
      );
    }
  }

  public async list(page: number = 1, perPage: number = 25): Promise<PolicyFile[]> {
    const policys = await this.so.find<any>({
      type: 'policies',
      search: '*',
      searchFields: ['shared_id'],
      page,
      perPage,
    });

    const uniqPolicyFile = policys.saved_objects
      .map<PolicyFile>(policySO => {
        const policy = {
          id: policySO.id,
          ...policySO.attributes,
        };
        const decoded = RuntimePolicyFile.decode(policy);

        if (decoded.isRight()) {
          return policy;
        } else {
          throw new Error(
            `Invalid PolicyFile data. == ${JSON.stringify(policy)}  -- ${PathReporter.report(
              decoded
            )}`
          );
        }
      })
      .reduce((acc, policy: PolicyFile) => {
        if (!acc.has(policy.shared_id)) {
          acc.set(policy.shared_id, policy);
        }
        const prevPolicy = acc.get(policy.shared_id);
        if (prevPolicy && prevPolicy.version < policy.version) {
          acc.set(policy.shared_id, policy);
        }

        return acc;
      }, new Map<string, PolicyFile>());

    return [...uniqPolicyFile.values()];
  }

  public async listVersions(
    sharedID: string,
    activeOnly = true,
    page: number = 1,
    perPage: number = 25
  ): Promise<PolicyFile[]> {
    const policys = (await this.so.find<any>({
      type: 'policies',
      search: sharedID,
      searchFields: ['shared_id'],
      page,
      perPage,
    })).saved_objects;

    if (!activeOnly) {
      const backupPolicies = await this.so.find<BackupPolicyFile>({
        type: 'backup_policies',
        search: sharedID,
        searchFields: ['shared_id'],
      });
      policys.concat(backupPolicies.saved_objects);
    }

    return policys.map<PolicyFile>(policySO => {
      const policy = {
        id: policySO.id,
        ...policySO.attributes,
      };
      if (RuntimePolicyFile.decode(policy).isRight()) {
        return policy;
      } else {
        throw new Error(`Invalid PolicyFile data. == ${policy}`);
      }
    });
  }

  public async update(id: string, policy: PolicyFile): Promise<{ id: string; version: number }> {
    const updatedPolicy = await this.so.update<PolicyFile>('policies', id, policy);

    return {
      id: policy.id,
      version: updatedPolicy.attributes.version || 1,
    };
  }

  public async deleteVersion(id: string): Promise<{ success: boolean }> {
    await this.so.delete('policies', id);
    return {
      success: true,
    };
  }

  public async createBackup(
    policy: BackupPolicyFile
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const newSo = await this.so.create<PolicyFile>('policies', (policy as any) as PolicyFile);

    return {
      success: newSo.error ? false : true,
      id: newSo.id,
      error: newSo.error ? newSo.error.message : undefined,
    };
  }

  public async getBackup(id: string): Promise<BackupPolicyFile> {
    const policy = await this.so.get<BackupPolicyFile>('backup_policies', id);

    if (policy.error) {
      throw new Error(policy.error.message);
    }

    if (!policy.attributes) {
      throw new Error(`No backup policy found with ID of ${id}`);
    }
    if (RuntimePolicyFile.decode(policy.attributes).isRight()) {
      return policy.attributes as BackupPolicyFile;
    } else {
      throw new Error(`Invalid BackupPolicyFile data. == ${policy.attributes}`);
    }
  }

  /**
   * Inputs sub-domain type
   */
  public async getInputsById(
    ids: string[],
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    const inputs = await this.so.find({
      type: 'policies',
      search: ids.reduce((query, id, i) => {
        if (i === ids.length - 1) {
          return `${query} ${id}`;
        }
        return `${query} ${id} |`;
      }, ''),
      searchFields: ['id'],
      perPage,
      page,
    });

    return inputs.saved_objects.map(input => input.attributes);
  }

  public async listInputsforPolicy(
    policyId: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    const inputs = await this.so.find({
      type: 'policies',
      search: policyId,
      searchFields: ['policy_id'],
      perPage,
      page,
    });

    return inputs.saved_objects.map(input => input.attributes);
  }

  public async addInputs(inputs: DatasourceInput[]): Promise<string[]> {
    const newInputs = [];
    for (const input of inputs) {
      newInputs.push(await this.so.create<DatasourceInput>('inputs', input));
    }

    return newInputs.map(input => input.attributes.id);
  }

  public async deleteInputs(inputIDs: string[]): Promise<{ success: boolean }> {
    for (const id of inputIDs) {
      await this.so.delete('inputs', id);
    }
    return {
      success: true,
    };
  }
}
