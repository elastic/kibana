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
  SavedObjectsCreateOptions,
  SavedObjectsBulkGetObject,
  SavedObjectsUpdateResponse,
} from 'src/core/server';
import { SODatabaseAdapter as SODatabaseAdapterType } from './adapter_types';
import { SODatabaseAdapter } from './default';
import { FrameworkRequest } from '../framework/adapter_types';

export class MemorizeSODatabaseAdapter implements SODatabaseAdapterType {
  constructor(private soAdadpter?: SODatabaseAdapter) {}

  async create<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    type: string,
    data: T,
    options?: SavedObjectsCreateOptions
  ) {
    return Slapshot.memorize(
      `create:${type}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.create(request, type, data, options);
      },
      { pure: false }
    );
  }

  async bulkCreate<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return Slapshot.memorize(
      `bulkCreate:${JSON.stringify(objects)}:${JSON.stringify(options || {})}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.bulkCreate(request, objects, options);
      },
      { pure: false }
    );
  }

  async delete(
    request: FrameworkRequest,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ) {
    return Slapshot.memorize(
      `delete:${type}:${id}:${JSON.stringify(options)}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.delete(request, type, id, options);
      },
      { pure: false }
    );
  }

  async find<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>> {
    return Slapshot.memorize(
      `find:${JSON.stringify(options)}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.find(request, options);
      },
      { pure: false }
    );
  }

  async bulkGet<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return Slapshot.memorize(
      `bulkCreate:${JSON.stringify(objects)}:${JSON.stringify(options || {})}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.bulkGet(request, objects, options);
      },
      { pure: false }
    );
  }

  async get<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    type: string,
    id: string,
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObject<T> | null> {
    return Slapshot.memorize(
      `get:${type}:${id}:${JSON.stringify(options)}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.get(request, type, id, options);
      },
      { pure: false }
    );
  }

  async update<T extends SavedObjectAttributes = any>(
    request: FrameworkRequest,
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return Slapshot.memorize(
      `get:${type}:${id}:${JSON.stringify(attributes)}:${JSON.stringify(options)}`,
      () => {
        if (!this.soAdadpter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.soAdadpter.update(request, type, id, attributes, options);
      },
      { pure: false }
    );
  }
}
