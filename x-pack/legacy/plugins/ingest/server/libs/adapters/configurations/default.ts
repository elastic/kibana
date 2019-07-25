/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SODatabaseAdapter } from '../so_database/default';
import { RuntimeConfigurationFile, NewConfigurationFile } from './adapter_types';

import { ConfigurationFile, DatasourceInput, BackupConfigurationFile } from './adapter_types';

export class ConfigAdapter {
  constructor(private readonly so: SODatabaseAdapter) {}

  public async create(
    configuration: NewConfigurationFile
  ): Promise<{ id: string; shared_id: string; version: number }> {
    const newSo = await this.so.create<ConfigurationFile>(
      'configurations',
      (configuration as any) as ConfigurationFile
    );

    return {
      id: newSo.id,
      shared_id: newSo.attributes.shared_id,
      version: newSo.attributes.version,
    };
  }

  public async get(id: string): Promise<ConfigurationFile> {
    const config = await this.so.get<any>('configurations', id);

    if (config.error) {
      throw new Error(config.error.message);
    }

    if (!config.attributes) {
      throw new Error(`No configuration found with ID of ${id}`);
    }
    if (RuntimeConfigurationFile.decode(config.attributes).isRight()) {
      return config.attributes as ConfigurationFile;
    } else {
      throw new Error(`Invalid ConfigurationFile data. == ${config.attributes}`);
    }
  }

  public async list(): Promise<ConfigurationFile[]> {
    const configs = await this.so.find<any>({
      type: 'configurations',
      search: '*',
      searchFields: ['shared_id'],
    });
    const uniqConfigurationFile = configs.saved_objects
      .map<ConfigurationFile>(config => {
        if (RuntimeConfigurationFile.decode(config.attributes).isRight()) {
          return config.attributes;
        } else {
          throw new Error(`Invalid ConfigurationFile data. == ${config.attributes}`);
        }
      })
      .reduce((acc, config: ConfigurationFile) => {
        if (!acc.has(config.shared_id)) {
          acc.set(config.shared_id, config);
        }
        const prevConfig = acc.get(config.shared_id);
        if (prevConfig && prevConfig.version < config.version) {
          acc.set(config.shared_id, config);
        }

        return acc;
      }, new Map<string, ConfigurationFile>());

    return [...uniqConfigurationFile.values()];
  }

  public async listVersions(sharedID: string, activeOnly = true): Promise<ConfigurationFile[]> {
    const configs = (await this.so.find<any>({
      type: 'configurations',
      search: sharedID,
      searchFields: ['shared_id'],
    })).saved_objects;

    if (!activeOnly) {
      const backupConfigs = await this.so.find<any>({
        type: 'backup_configurations',
        search: sharedID,
        searchFields: ['shared_id'],
      });
      configs.concat(backupConfigs.saved_objects);
    }

    return configs.map<ConfigurationFile>(config => {
      if (RuntimeConfigurationFile.decode(config.attributes).isRight()) {
        return config.attributes;
      } else {
        throw new Error(`Invalid ConfigurationFile data. == ${config.attributes}`);
      }
    });
  }

  public async update(
    sharedID: string,
    fromVersion: number,
    configuration: ConfigurationFile
  ): Promise<{ id: string; version: number }> {
    return {
      id: 'fsdfsdf',
      version: 0,
    };
  }

  public async delete(
    sharedID: string,
    version?: number
  ): Promise<{ success: boolean; error?: string }> {
    return {
      success: true,
    };
  }

  public async createBackup(
    sharedID: string,
    version?: number
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    return {
      success: true,
      id: 'k3jh5lk3j4h5kljh43',
    };
  }

  public async getBackup(sharedID: string, version?: number): Promise<BackupConfigurationFile> {
    return {} as BackupConfigurationFile;
  }

  /**
   * Inputs sub-domain type
   */
  public async getInputsById(ids: string[]): Promise<DatasourceInput[]> {
    return [{} as DatasourceInput];
  }

  public async addInputs(
    sharedID: string,
    version: number,
    dsUUID: string,
    input: DatasourceInput
  ): Promise<string> {
    return 'htkjerhtkwerhtkjehr';
  }

  public async deleteInputs(inputID: string[]): Promise<{ success: boolean; error?: string }> {
    return {
      success: true,
    };
  }
}
