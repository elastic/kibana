/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memorize } from '@mattapperson/slapshot/lib/memorize';
import { NewPolicyFile } from './adapter_types';
import { PolicyFile, DatasourceInput, BackupPolicyFile } from './adapter_types';
import { PolicyAdapter } from './default';

export class MemorizedPolicyAdapter {
  constructor(private readonly adapter?: PolicyAdapter) {}

  public async create(newPolicy: NewPolicyFile, options?: { id?: string }): Promise<PolicyFile> {
    const { shared_id, ...policy } = newPolicy;
    return await memorize(
      `create - ${JSON.stringify({ name: policy.name, description: policy.description })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.create(newPolicy, options);
      },
      {
        pure: false,
      }
    );
  }

  public async get(id: string): Promise<PolicyFile> {
    return await memorize(
      `get - ${JSON.stringify(id)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.get(id);
      },
      {
        pure: false,
      }
    );
  }

  public async list(
    page: number = 1,
    perPage: number = 25
  ): Promise<{ items: PolicyFile[]; total: number }> {
    return await memorize(
      `list - ${JSON.stringify({ page, perPage })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.list(page, perPage);
      },
      {
        pure: false,
      }
    );
  }

  public async listVersions(
    sharedID: string,
    activeOnly = true,
    page: number = 1,
    perPage: number = 25
  ): Promise<PolicyFile[]> {
    return await memorize(
      `listVersions - ${JSON.stringify({ sharedID, activeOnly, page, perPage })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.listVersions(sharedID, activeOnly, page, perPage);
      },
      {
        pure: false,
      }
    );
  }

  public async update(id: string, policy: PolicyFile): Promise<{ id: string; version: number }> {
    return await memorize(
      `update - ${JSON.stringify({ name: policy.name, description: policy.description })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.update(id, policy);
      },
      {
        pure: false,
      }
    );
  }

  public async deleteVersion(sharedId: string): Promise<{ success: boolean }> {
    return await memorize(
      `deleteVersion - ${JSON.stringify(sharedId)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.deleteVersion(sharedId);
      },
      {
        pure: false,
      }
    );
  }

  public async createBackup(
    policy: BackupPolicyFile
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    return await memorize(
      `createBackup - ${JSON.stringify(policy)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.createBackup(policy);
      },
      {
        pure: false,
      }
    );
  }

  public async getBackup(id: string): Promise<BackupPolicyFile> {
    return await memorize(
      `getBackup - ${JSON.stringify(id)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.getBackup(id);
      },
      {
        pure: false,
      }
    );
  }

  /**
   * Inputs sub-domain type
   */
  public async getInputsById(ids: string[]): Promise<DatasourceInput[]> {
    return await memorize(
      `getInputsById - ${JSON.stringify({ ids })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.getInputsById(ids);
      },
      {
        pure: false,
      }
    );
  }

  public async listInputsforPolicy(
    policyId: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    return await memorize(
      `listInputsforPolicy - ${JSON.stringify({ policyId, page, perPage })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.listInputsforPolicy(policyId, page, perPage);
      },
      {
        pure: false,
      }
    );
  }

  public async addInputs(inputs: DatasourceInput[]): Promise<string[]> {
    return await memorize(
      `addInputs - ${JSON.stringify(inputs.map(i => i.id))}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.addInputs(inputs);
      },
      {
        pure: false,
      }
    );
  }

  public async deleteInputs(inputIDs: string[]): Promise<{ success: boolean }> {
    return await memorize(
      `deleteInputs - ${JSON.stringify(inputIDs)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.deleteInputs(inputIDs);
      },
      {
        pure: false,
      }
    );
  }
}
