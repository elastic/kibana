/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
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
  SavedObjectsClient as SavedObjectsClientType,
  SavedObjectsService,
} from 'src/core/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { SODatabaseAdapter as SODatabaseAdapterType } from './adapter_types';
import { FrameworkUser, internalAuthData } from '../framework/adapter_types';

export class SODatabaseAdapter implements SODatabaseAdapterType {
  private readonly internalClient: SavedObjectsClientType;
  constructor(
    private readonly savedObject: SavedObjectsService,
    elasticsearch: ElasticsearchPlugin
  ) {
    const { SavedObjectsClient, getSavedObjectsRepository } = savedObject;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);

    this.internalClient = new SavedObjectsClient(internalRepository);
    this.savedObject = savedObject;
  }

  private getClient(user: FrameworkUser) {
    if (user.kind === 'authenticated') {
      return this.savedObject.getScopedSavedObjectsClient({
        headers: user[internalAuthData],
      });
    }

    if (user.kind === 'internal') {
      return this.internalClient;
    }

    throw new Error('Not supported');
  }
  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  async create<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    type: string,
    data: T,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.getClient(user).create(type, data, options);
  }

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  async bulkCreate<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.getClient(user).bulkCreate(objects, options);
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(
    user: FrameworkUser,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ) {
    return await this.getClient(user).delete(type, id, options);
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return await this.getClient(user).find(options);
  }

  /**
   * Returns an array of objects by id
   *
   * @param objects - an array of ids, or an array of objects containing id, type and optionally fields
   * @example
   *
   * bulkGet([
   *   { id: 'one', type: 'config' },
   *   { id: 'foo', type: 'index-pattern' }
   * ])
   */
  async bulkGet<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this.getClient(user).bulkGet(objects, options);
  }

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async get<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T> | null> {
    try {
      const savedObject = await this.getClient(user).get(type, id, options);

      return savedObject;
    } catch (err) {
      if (err.isBoom && err.output.statusCode === 404) {
        return null;
      }

      throw err;
    }
  }

  /**
   * Updates an SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async update<T extends SavedObjectAttributes = any>(
    user: FrameworkUser,
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this.getClient(user).update(type, id, attributes, options);
  }
}
