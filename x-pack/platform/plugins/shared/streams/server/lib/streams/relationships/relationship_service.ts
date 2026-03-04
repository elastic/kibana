/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import type { RelationshipStorageSettings } from './storage_settings';
import { relationshipStorageSettings } from './storage_settings';
import { RelationshipClient } from './relationship_client';
import type { StoredRelationship } from './stored_relationship';
import { storedRelationshipSchema } from './stored_relationship';

export class RelationshipService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<RelationshipClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<RelationshipStorageSettings, StoredRelationship>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('relationships'),
      relationshipStorageSettings,
      {
        migrateSource: (relationship: Record<string, unknown>) => {
          // Validate that stored documents match the expected schema
          const parsed = storedRelationshipSchema.parse(relationship);
          return parsed;
        },
      }
    );

    return new RelationshipClient({ storageClient: adapter.getClient() });
  }
}
