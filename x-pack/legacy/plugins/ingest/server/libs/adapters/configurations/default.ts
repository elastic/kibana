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
    const config = await this.so.get<ConfigurationFile>('configurations', id);

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

  public async list(page: number = 1, perPage: number = 25): Promise<ConfigurationFile[]> {
    const configs = await this.so.find<any>({
      type: 'configurations',
      search: '*',
      searchFields: ['shared_id'],
      page,
      perPage,
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

  public async listVersions(
    sharedID: string,
    activeOnly = true,
    page: number = 1,
    perPage: number = 25
  ): Promise<ConfigurationFile[]> {
    const configs = (await this.so.find<any>({
      type: 'configurations',
      search: sharedID,
      searchFields: ['shared_id'],
      page,
      perPage,
    })).saved_objects;

    if (!activeOnly) {
      const backupConfigs = await this.so.find<BackupConfigurationFile>({
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
    id: string,
    configuration: ConfigurationFile
  ): Promise<{ id: string; version: number }> {
    const config = await this.so.update<ConfigurationFile>('configurations', id, configuration);

    return {
      id: config.id,
      version: config.attributes.version || 1,
    };
  }

  public async delete(id: string): Promise<{ success: boolean }> {
    await this.so.delete('configurations', id);
    return {
      success: true,
    };
  }

  public async createBackup(
    configuration: BackupConfigurationFile
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const newSo = await this.so.create<ConfigurationFile>(
      'configurations',
      (configuration as any) as ConfigurationFile
    );

    return {
      success: newSo.error ? false : true,
      id: newSo.id,
      error: newSo.error ? newSo.error.message : undefined,
    };
  }

  public async getBackup(id: string): Promise<BackupConfigurationFile> {
    const config = await this.so.get<BackupConfigurationFile>('backup_configurations', id);

    if (config.error) {
      throw new Error(config.error.message);
    }

    if (!config.attributes) {
      throw new Error(`No backup configuration found with ID of ${id}`);
    }
    if (RuntimeConfigurationFile.decode(config.attributes).isRight()) {
      return config.attributes as BackupConfigurationFile;
    } else {
      throw new Error(`Invalid BackupConfigurationFile data. == ${config.attributes}`);
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
      type: 'configurations',
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

  public async listInputsforConfiguration(
    configurationId: string,
    page: number = 1,
    perPage: number = 25
  ): Promise<DatasourceInput[]> {
    const inputs = await this.so.find({
      type: 'configurations',
      search: configurationId,
      searchFields: ['config_id'],
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
