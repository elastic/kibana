/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsLegacyService } from 'src/core/server';
import { UMSavedObjectsAdapter } from './types';
import uptimeIndexPattern from './heartbeat_index_pattern.json';

export class UMKibanaSavedObjectsAdapter implements UMSavedObjectsAdapter {
  private readonly savedObjectsClient: any;
  constructor(savedObjects: SavedObjectsLegacyService<any>, elasticsearch: any) {
    const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);
    this.savedObjectsClient = new SavedObjectsClient(internalRepository);
  }

  public async getUptimeIndexPattern(): Promise<any> {
    try {
      return await this.savedObjectsClient.get('index-pattern', uptimeIndexPattern.id);
    } catch (error) {
      return await this.savedObjectsClient.create(
        'index-pattern',
        {
          ...uptimeIndexPattern.attributes,
          title: 'UptimeIndexPattern',
        },
        { id: uptimeIndexPattern.id, overwrite: false }
      );
    }
  }
}
