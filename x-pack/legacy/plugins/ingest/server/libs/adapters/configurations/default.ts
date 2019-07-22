/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ConfigurationFile,
  NewConfigurationFile,
  DatasourceInput,
  BackupConfigurationFile,
} from './adapter_types';

export class DefaultConfigAdapter {
  public async create(
    configuration: NewConfigurationFile
  ): Promise<{ id: string; shared_id: string; version: number }> {
    return {
      id: 'fsdfsdf',
      shared_id: 'wjkhefkjhfkjs',
      version: 0,
    };
  }

  public async get(sharedID: string, version?: number): Promise<ConfigurationFile> {
    return {} as ConfigurationFile;
  }

  public async list(sharedID: string, version?: number): Promise<ConfigurationFile[]> {
    return [{} as ConfigurationFile];
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
