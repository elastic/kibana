/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memorize } from '@mattapperson/slapshot/lib/memorize';
import { NewConfigurationFile } from './adapter_types';
import { ConfigurationFile, DatasourceInput, BackupConfigurationFile } from './adapter_types';
import { ConfigAdapter } from './default';

export class MemorizedConfigAdapter {
  constructor(private readonly adapter?: ConfigAdapter) {}

  public async create(
    configuration: NewConfigurationFile
  ): Promise<{ id: string; shared_id: string; version: number }> {
    const { shared_id, ...config } = configuration;
    return await memorize(
      `create - ${JSON.stringify({ ...config, shared_id: 'string' })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.create(configuration);
      },
      {
        pure: false,
      }
    );
  }

  public async get(id: string): Promise<ConfigurationFile> {
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

  public async list(page: number = 1, perPage: number = 25): Promise<ConfigurationFile[]> {
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
  ): Promise<ConfigurationFile[]> {
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

  public async update(
    id: string,
    configuration: ConfigurationFile
  ): Promise<{ id: string; version: number }> {
    return await memorize(
      `update - ${JSON.stringify({ id, configuration })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.update(id, configuration);
      },
      {
        pure: false,
      }
    );
  }

  public async delete(id: string): Promise<{ success: boolean }> {
    return await memorize(
      `delete - ${JSON.stringify(id)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.delete(id);
      },
      {
        pure: false,
      }
    );
  }

  public async createBackup(
    configuration: BackupConfigurationFile
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    return await memorize(
      `createBackup - ${JSON.stringify(configuration)}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.createBackup(configuration);
      },
      {
        pure: false,
      }
    );
  }

  public async getBackup(id: string): Promise<BackupConfigurationFile> {
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
  public async getInputsById(
    ids: string[],
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    return await memorize(
      `getInputsById - ${JSON.stringify({ ids, page, perPage })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.getInputsById(ids, page, perPage);
      },
      {
        pure: false,
      }
    );
  }

  public async listInputsforConfiguration(
    configurationId: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    return await memorize(
      `listInputsforConfiguration - ${JSON.stringify({ configurationId, page, perPage })}`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.adapter.listInputsforConfiguration(configurationId, page, perPage);
      },
      {
        pure: false,
      }
    );
  }

  public async addInputs(inputs: DatasourceInput[]): Promise<string[]> {
    return await memorize(
      `addInputs - ${JSON.stringify(inputs)}`,
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
