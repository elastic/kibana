/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { StreamsPluginStartDependencies } from '../../types';
import {
  ContentClient,
  ContentStorageSettings,
  StoredContentPack,
  contentStorageSettings,
} from './content_client';

export class ContentService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClient(): Promise<ContentClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<ContentStorageSettings, StoredContentPack>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('content'),
      contentStorageSettings
    );

    return new ContentClient({
      storageClient: adapter.getClient(),
    });
  }
}
