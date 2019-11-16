/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { ElasticsearchAdapter } from './adapter_types';
import { FrameworkUser } from '../framework/adapter_types';

export class MemorizedElasticsearchAdapter implements ElasticsearchAdapter {
  constructor(private readonly esAdapter?: ElasticsearchAdapter) {}
  public async authenticate(user: FrameworkUser<any>): Promise<any> {
    return Slapshot.memorize(
      `authenticate`,
      async () => {
        if (!this.esAdapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.esAdapter.authenticate(user);
      },
      { pure: false }
    );
  }
  public async createApiKey(
    user: FrameworkUser<any>,
    data: { name: string; expiration?: any; role_descriptors?: any }
  ): Promise<{ id: string; api_key: string }> {
    return Slapshot.memorize(
      `createApiKey`,
      async () => {
        if (!this.esAdapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.esAdapter.createApiKey(user, data);
      },
      { pure: false }
    );
  }

  public async deleteApiKey(user: FrameworkUser<any>, data: { id: string }): Promise<void> {
    return Slapshot.memorize(
      `deleteApiKey`,
      async () => {
        if (!this.esAdapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return await this.esAdapter.deleteApiKey(user, data);
      },
      { pure: false }
    );
  }
}
