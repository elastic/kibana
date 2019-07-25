/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import {
  SavedObjectAttributes,
  SavedObjectsBulkCreateObject,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkResponse,
  SavedObject,
  SavedObjectsUpdateOptions,
} from 'src/core/server';
import {
  SavedObjectsCreateOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsUpdateResponse,
} from 'target/types/server';
import { SODatabaseAdapter } from './default';

const { memorize } = Slapshot;

/**
 * MockedSoDatabaseAdapter that use Slapshot
 */
export class MockedSODatabaseAdapter implements Omit<SODatabaseAdapter, 'client'> {
  constructor(private readonly soAdapter?: SODatabaseAdapter) {}
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
    return memorize(
      `create:${type}:${JSON.stringify(data)}:${JSON.stringify(options || {})}`,
      async () => {
        if (!this.soAdapter) {
          throw new Error('You need to provide a valid saved object adapter');
        }

        return this.soAdapter.create(type, data, options);
      }
    );
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
    return memorize(`bulk_create:${objects}:${JSON.stringify(options)}`, async () => {
      if (!this.soAdapter) {
        throw new Error('You need to provide a valid saved object adapter');
      }

      return this.soAdapter.bulkCreate(objects, options);
    });
  }

  /**
   * Deletes a SavedObject
   *
   * @param type
   * @param id
   * @param options
   */
  async delete(type: string, id: string, options: SavedObjectsBaseOptions = {}) {
    return memorize(`delete:${type}:${id}:${JSON.stringify(options)}`, async () => {
      if (!this.soAdapter) {
        throw new Error('You need to provide a valid saved object adapter');
      }

      return this.soAdapter.delete(type, id, options);
    });
  }

  /**
   * Find all SavedObjects matching the search query
   *
   * @param options
   */
  async find<T extends SavedObjectAttributes = any>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return memorize(`find:${JSON.stringify(options)}`, async () => {
      if (!this.soAdapter) {
        throw new Error('You need to provide a valid saved object adapter');
      }

      return this.soAdapter.find(options);
    });
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
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return memorize(`bulkGet:${JSON.stringify(objects)}:${JSON.stringify(options)}`, async () => {
      if (!this.soAdapter) {
        throw new Error('You need to provide a valid saved object adapter');
      }

      return this.soAdapter.bulkGet(objects, options);
    });
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
    return memorize(`get:${type}:${id}:${JSON.stringify(options)}`, async () => {
      if (!this.soAdapter) {
        throw new Error('You need to provide a valid saved object adapter');
      }

      return this.soAdapter.get(type, id, options);
    });
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
    return memorize(
      `update:${type}:${id}:${JSON.stringify(attributes)}:${JSON.stringify(options)}`,
      async () => {
        if (!this.soAdapter) {
          throw new Error('You need to provide a valid saved object adapter');
        }

        return this.soAdapter.update(type, id, attributes, options);
      }
    );
  }
}
