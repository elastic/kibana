/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkUser } from '../framework/adapter_types';

export interface ElasticsearchAdapter {
  authenticate(user: FrameworkUser): Promise<any>;
  createApiKey(
    user: FrameworkUser,
    data: { name: string; expiration?: any; role_descriptors?: any }
  ): Promise<{ id: string; api_key: string }>;
  deleteApiKey(user: FrameworkUser, data: { id: string }): Promise<void>;
}
