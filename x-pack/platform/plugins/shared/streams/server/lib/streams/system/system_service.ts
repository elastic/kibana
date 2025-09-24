/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { SystemClient } from './system_client';
import type { StoredSystem } from './stored_system';
import type { SystemStorageSettings } from './storage_settings';
import { systemStorageSettings } from './storage_settings';

export class SystemService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<SystemClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<SystemStorageSettings, StoredSystem>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('systems'),
      systemStorageSettings
    );

    return new SystemClient({
      storageClient: adapter.getClient(),
    });
  }
}
