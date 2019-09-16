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
  SavedObjectsService,
} from 'src/core/server';
import { SODatabaseAdapter as SODatabaseAdapterType } from './adapter_types';
import { FrameworkRequest } from '../framework/adapter_types';

export class SODatabaseAdapter implements SODatabaseAdapterType {
  constructor(private readonly savedObject: SavedObjectsService) {}

  private getClient(request: FrameworkRequest) {
    return this.savedObject.getScopedSavedObjectsClient(request);
  }
  /**
   * Persists a SavedObject
   *
   * @param type
   * @param attributes
   * @param options
   */
  async create<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    type: string,
    data: T,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.getClient(request).create(type, data, options);
  }

  /**
   * Persists multiple documents batched together as a single request
   *
   * @param objects
   * @param options
   */
  async bulkCreate<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this.getClient(request).bulkCreate(objects, options);
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(
    request: FrameworkRequest,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ) {
    return await this.getClient(request).delete(type, id, options);
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return await this.getClient(request).find(options);
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
    request: FrameworkRequest,
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this.getClient(request).bulkGet(objects, options);
  }

  /**
   * Retrieves a single object
   *
   * @param type - The type of SavedObject to retrieve
   * @param id - The ID of the SavedObject to retrieve
   * @param options
   */
  async get<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T> | null> {
    try {
      const savedObject = await this.getClient(request).get(type, id, options);

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
    request: FrameworkRequest,
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this.getClient(request).update(type, id, attributes, options);
  }
}
