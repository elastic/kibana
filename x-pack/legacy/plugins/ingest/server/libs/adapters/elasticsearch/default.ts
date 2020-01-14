/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { ElasticsearchAdapter as ElasticsearchAdapterType } from './adapter_types';
import { FrameworkUser, internalAuthData } from '../framework/adapter_types';

export class ElasticsearchAdapter implements ElasticsearchAdapterType {
  constructor(private readonly elasticsearch: ElasticsearchPlugin) {}

  public async createApiKey(
    user: FrameworkUser,
    data: { name: string; expiration?: any; role_descriptors?: any }
  ) {
    const options = {
      method: 'POST',
      path: '/_security/api_key',
      body: data,
    };
    return await this._call(user, 'transport.request', options);
  }

  public async deleteApiKey(user: FrameworkUser, data: { id: string }) {
    const options = {
      method: 'DELETE',
      path: '/_security/api_key',
      body: data,
    };
    return await this._call(user, 'transport.request', options);
  }

  public async authenticate(user: FrameworkUser) {
    if (user.kind !== 'authenticated') {
      throw new Error('Not supported');
    }
    const options = {
      method: 'GET',
      path: '/_security/_authenticate',
    };
    return await this._call(user, 'transport.request', options);
  }

  private async _call(user: FrameworkUser, endpoint: any, params: any): Promise<any> {
    const { callWithInternalUser, callWithRequest } = this.elasticsearch.getCluster('admin');
    if (user.kind === 'internal') {
      return await callWithInternalUser(endpoint, params);
      throw new Error('Elastic search call is only implemented for internal user');
    }

    if (user.kind === 'authenticated') {
      return await callWithRequest(user[internalAuthData], endpoint, params);
    }

    throw new Error('Elastic search call is not implemented for unauthenticated user');
  }
}
