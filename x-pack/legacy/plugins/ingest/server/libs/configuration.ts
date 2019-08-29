/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, omit } from 'lodash';
import uuidv4 from 'uuid/v4';
import uuid from 'uuid/v4';
import { ConfigAdapter } from './adapters/configurations/default';
import { BackendFrameworkLib } from './framework';
import { ConfigurationFile, Datasource } from './adapters/configurations/adapter_types';

export class ConfigurationLib {
  constructor(
    private readonly adapter: ConfigAdapter,
    private readonly libs: {
      framework: BackendFrameworkLib;
    }
  ) {}
  public async create(name: string, description?: string) {
    const info = await this.libs.framework.info;
    if (!info) {
      throw new Error('Could not get version information about Kibana from xpack');
    }

    return await this.adapter.create({
      name,
      description: description || '',
      output: 'defaut',
      monitoring_enabled: true,
      shared_id: uuid(),
      version: 0,
      agent_version: info.kibana.version,
      data_sources: [],
    });
  }

  public async get(id: string): Promise<ConfigurationFile> {
    const config = await this.adapter.get(id);
    return config;
  }

  public async list(page: number = 1, perPage: number = 25): Promise<ConfigurationFile[]> {
    const configs = await this.adapter.list(page, perPage);
    return configs;
  }

  public async listVersions(
    sharedID: string,
    activeOnly = true,
    page: number = 1,
    perPage: number = 25
  ): Promise<ConfigurationFile[]> {
    const configs = await this.adapter.listVersions(sharedID, activeOnly, page, perPage);
    return configs;
  }

  public async update(
    id: string,
    configuration: Partial<{
      name: string;
      description: string;
      output: string;
      monitoring_enabled: boolean;
    }>
  ): Promise<{ id: string; version: number }> {
    const invalidKeys = Object.keys(configuration).filter(
      key => !['name', 'description', 'output', 'monitoring_enabled'].includes(key)
    );

    if (invalidKeys.length !== -1) {
      throw new Error(
        `Update was called with configuration paramaters that are not allowed: ${invalidKeys}`
      );
    }
    const oldConfig = await this.adapter.get(id);

    if (oldConfig.status === 'active') {
      throw new Error(
        `Config ${oldConfig.id} can not be updated becuase it is ${oldConfig.status}`
      );
    }

    const newConfig = await this._update(oldConfig, configuration);
    return newConfig;
  }

  public async delete(id: string): Promise<{ success: boolean }> {
    return await this.adapter.delete(id);
  }

  public async createNewConfigFrom(configId: string) {
    const { id, data_sources: dataSources, ...oldConfig } = await this.adapter.get(configId);
    const newConfig = await this.adapter.create({ ...oldConfig, data_sources: [] });

    const newDSs: ConfigurationFile['data_sources'] = [];
    for (const ds of dataSources) {
      // TODO page through vs one large query as this will break if there are more then 10k inputs
      // a likely case for uptime
      const oldInputs = await this.adapter.getInputsById(ds.inputs, 1, 10000);
      const newInputs = await this.adapter.addInputs(
        oldInputs.map(input => ({
          ...input,
          id: uuidv4(),
          config_id: newConfig.id,
        }))
      );

      newDSs.push({ ...ds, uuid: uuidv4(), inputs: newInputs });
    }

    await this.adapter.update(newConfig.id, {
      id: newConfig.id,
      ...oldConfig,
      data_sources: newDSs,
    });
    // TODO fire events for fleet that update was made
  }

  public async upgrade(configId: string, version: string) {
    const { id, agent_version: agentVersion, ...oldConfig } = await this.adapter.get(configId);
    const newConfig = await this.adapter.create({ ...oldConfig, agent_version: agentVersion });

    // TODO: ensure new version is greater then old
    // TODO: Ensure new version is a valid version number for agent
    // TODO: ensure new version works with current ES version
    // TODO: trigger and merge in config changes from intigrations

    await this.adapter.update(newConfig.id, {
      id: newConfig.id,
      ...oldConfig,
      agent_version: version,
    });
    // TODO fire events for fleet that update was made
  }

  public async finishUpdateFrom(configId: string) {
    const oldConfig = await this.adapter.get(configId);
    await this.adapter.update(configId, {
      ...oldConfig,
      status: 'inactive',
    });
  }

  public async rollForward(id: string): Promise<{ id: string; version: number }> {
    const oldConfig = await this.adapter.get(id);

    await this._update(oldConfig, {});
    return {
      id: 'fsdfsdf',
      version: 0,
    };
  }

  /**
   * request* because in the future with an approval flow it will not directly make the change
   */
  public async requestAddDataSource(configId: string, datasource: Datasource) {
    const oldConfig = await this.adapter.get(configId);

    if (oldConfig.status === 'active') {
      throw new Error(
        `Config ${oldConfig.id} can not be updated becuase it is ${oldConfig.status}`
      );
    }

    // TODO add inputs, and replace in array with IDs

    await this._update(oldConfig, {
      data_sources: [...oldConfig.data_sources, datasource],
    });

    // TODO return data
  }

  /**
   * request* because in the future with an approval flow it will not directly make the change
   */
  public async requestDeleteDataSource(configId: string, datasourceUUID: string) {
    const oldConfig = await this.adapter.get(configId);

    if (oldConfig.status === 'active') {
      throw new Error(
        `Config ${oldConfig.id} can not be updated becuase it is ${oldConfig.status}`
      );
    }

    if (!oldConfig.data_sources.find(ds => ds.uuid !== datasourceUUID)) {
      throw new Error(
        `Config ${oldConfig.id} does not contain a datasource with a uuid of ${datasourceUUID}`
      );
    }

    await this._update(oldConfig, {
      data_sources: oldConfig.data_sources.filter(ds => ds.uuid !== datasourceUUID),
    });

    // TODO return something
  }

  public async listDataSources() {
    throw new Error('Not yet implamented');
  }

  private async _update(oldConfig: ConfigurationFile, config: Partial<ConfigurationFile>) {
    const newConfig = await this.adapter.create({
      ...merge<ConfigurationFile>({}, omit(oldConfig, ['id']), config),
      version: oldConfig.version + 1,
    });

    await this.adapter.update(oldConfig.id, {
      ...omit(oldConfig, ['id']),
      status: 'locked',
    });
    // TODO fire events for fleet that update was made

    return newConfig;
  }
}
