/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsService,
  SavedObjectsClient as SavedObjectsClientType,
  SavedObjectAttributes,
  SavedObjectsBulkCreateObject,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkResponse,
  SavedObject,
  SavedObjectsUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsUpdateResponse,
} from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

export class SODatabaseAdapter {
  private client: SavedObjectsClientType;
  constructor(savedObjects: SavedObjectsService, elasticsearch: ElasticsearchPlugin) {
    const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);

    this.client = new SavedObjectsClient(internalRepository);
  }

  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  async create<T extends SavedObjectAttributes = any>(
    type: string,
    data: T,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.client.create(type, data, options);
  }

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  async bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.client.bulkCreate(objects, options);
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    return await this.client.delete(type, id, options);
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T extends SavedObjectAttributes = any>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return await this.client.find(options);
  }

  /**
   * Returns an array of objects by id
   *
   * @param objects - an array of ids, or an array of objects containing id, type and optionally fields
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'policy' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet<T extends SavedObjectAttributes = any>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this.client.bulkGet(objects, options);
  }

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T>> {
    return await this.client.get(type, id, options);
  }

  /**
   * Updates an SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this.client.update(type, id, attributes, options);
  }
}
