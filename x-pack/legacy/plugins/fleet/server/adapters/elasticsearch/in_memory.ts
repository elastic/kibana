/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAdapter as ElasticsearchAdapterType } from './adapter_types';
import { FrameworkUser } from '../framework/adapter_types';

/**
 * In memory fake elastic search adapter for tests purpose only
 */
export class InMemoryElasticsearchAdapter implements ElasticsearchAdapterType {
  public apiKeys: {
    [k: string]: {
      api_key: string;
      id: string;
    };
  } = {};

  private keyId = 1;

  public async createApiKey(
    user: FrameworkUser,
    data: { name: string; expiration?: any; role_descriptors?: any }
  ) {
    const id = `api-key-${this.keyId++}`;
    const key = Buffer.from(`${id}:VALID_API_KEY`).toString('base64');

    const apiKey = {
      id,
      api_key: key,
    };

    this.apiKeys[apiKey.id] = apiKey;

    return this.apiKeys[apiKey.id];
  }

  public async deleteApiKey(user: FrameworkUser, data: { id: string }) {
    delete this.apiKeys[data.id];
  }

  public async authenticate(user: FrameworkUser) {
    return;
  }
}
