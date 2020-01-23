/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { BackendFrameworkLib } from './framework';
import { Output, OutputType } from '../../common/types/domain_data';
import { OutputAdapter } from './adapters/outputs/default';
import { IngestPluginsStart } from './compose/kibana';

export class OutputsLib {
  constructor(
    private readonly libs: {
      framework: BackendFrameworkLib;
    },
    private readonly adapter: OutputAdapter,
    private readonly pluginsStart: IngestPluginsStart
  ) {}

  public async createDefaultOutput(
    user: FrameworkUser,
    adminUser: { username: string; password: string }
  ) {
    const defaultOutput = await this.adapter.get(user, 'default');
    if (!defaultOutput) {
      const apiKey = await this._createDefaultApiKey(adminUser.username, adminUser.password);
      // Create default output with an API KEY
      await this.adapter.create(
        user,
        {
          name: 'default',
          type: OutputType.Elasticsearch,
          hosts: [this.libs.framework.getSetting('defaultOutputHost')],
          ingest_pipeline: 'default',
          api_key: apiKey,
          admin_username: 'elastic',
          admin_password: 'changeme',
        },
        {
          id: 'default',
        }
      );
    }
  }

  public async getAdminUser() {
    const so = await this.pluginsStart.encryptedSavedObjects.getDecryptedAsInternalUser(
      'outputs',
      'default'
    );

    return {
      username: so.attributes.admin_username,
      password: so.attributes.admin_password,
    };
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

  // TEMPORARY this is going to be per agent
  private async _createDefaultApiKey(username: string, password: string): Promise<string> {
    const key = await this.pluginsStart.security.authc.createAPIKey(
      {
        headers: {
          authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        },
      } as KibanaRequest,
      {
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
      }
    );
    if (!key) {
      throw new Error('An error occured while creating default API Key');
    }

    return `${key.id}:${key.api_key}`;
  }
}
