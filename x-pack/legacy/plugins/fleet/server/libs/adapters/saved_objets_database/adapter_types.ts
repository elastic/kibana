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
} from 'src/core/server';

export interface SODatabaseAdapter {
  create<T extends SavedObjectAttributes = any>(
    type: string,
    data: T,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObject<T>>;

  bulkCreate<T extends SavedObjectAttributes = any>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  delete(type: string, id: string, options?: SavedObjectsBaseOptions): Promise<{}>;

  find<T extends SavedObjectAttributes = any>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T>>;

  bulkGet<T extends SavedObjectAttributes = any>(
    objects: SavedObjectsBulkGetObject[],
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObjectsBulkResponse<T>>;

  get<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ): Promise<SavedObject<T> | null>;

  update<T extends SavedObjectAttributes = any>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options?: SavedObjectsUpdateOptions
  ): Promise<SavedObjectsUpdateResponse<T>>;
}
