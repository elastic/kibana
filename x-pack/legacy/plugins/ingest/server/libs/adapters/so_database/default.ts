/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsService, SavedObjectsClient as SavedObjectsClientType } from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

export class SODatabaseAdapter {
  private client: SavedObjectsClientType;
  constructor(savedObjects: SavedObjectsService, elasticsearch: ElasticsearchPlugin) {
    const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);

    this.client = new SavedObjectsClient(internalRepository);
  }
}
