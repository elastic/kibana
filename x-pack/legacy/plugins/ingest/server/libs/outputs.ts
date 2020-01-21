/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from './adapters/framework/adapter_types';
import { BackendFrameworkLib } from './framework';
import { Output, OutputType } from '../../common/types/domain_data';
import { OutputAdapter } from './adapters/outputs/default';
import { ElasticsearchAdapter } from './adapters/elasticsearch/default';

export class OutputsLib {
  constructor(
    private readonly libs: {
      framework: BackendFrameworkLib;
    },
    private readonly elasticsearch: ElasticsearchAdapter,
    private readonly adapter: OutputAdapter
  ) {}

  public async ensureDefaultOutput() {
    const defaultOutput = await this.adapter.get(this.libs.framework.internalUser, 'default');
    if (!defaultOutput) {
      const apiKey = await this.createDefaultApiKey();
      // Create default output with an API KEY
      await this.adapter.create(
        this.libs.framework.internalUser,
        {
          name: 'default',
          type: OutputType.Elasticsearch,
          hosts: [this.libs.framework.getSetting('defaultOutputHost')],
          ingest_pipeline: 'default',
          api_key: apiKey,
        },
        {
          id: 'default',
        }
      );
    }
  }

  public async getAdminUser() {
    // TEMPORY DO BETTER :)
    return {
      username: 'elastic',
      password: 'changeme',
    };

    // const [defaultOutput] = await libs.outputs.getByIDs(libs.framework.internalUser, ['default']);
    // if (!defaultOutput) {
    //   throw new Error('No default output');
    // }

    // return {
    //   username: defaultOutput.admin_username,
    //   password: defaultOutput.admin_password,
    // };
  }

  public async getByIDs(_user: FrameworkUser, ids: string[]): Promise<Output[]> {
    if (ids.length > 0 && ids[0] !== 'default') {
      throw new Error('Currently, only a default output is supported');
    }

    const defaultOutput = await this.adapter.get(_user, 'default');
    if (!defaultOutput) {
      throw new Error('No default output configured');
    }

    return [defaultOutput];
  }

  private async createDefaultApiKey(): Promise<string> {
    const key = await this.elasticsearch.createApiKey(this.libs.framework.internalUser, {
      name: 'fleet-default-output',
      role_descriptors: {
        'fleet-output': {
          cluster: ['monitor'],
          index: [
            {
              names: ['logs-*', 'metrics-*'],
              privileges: ['write'],
            },
          ],
        },
      },
    });

    return `${key.id}:${key.api_key}`;
  }
}
