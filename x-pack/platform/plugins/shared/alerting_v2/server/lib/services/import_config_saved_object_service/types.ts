/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { ImportConfigSavedObjectAttributes } from '../../../saved_objects';

export interface ImportConfigSavedObjectDoc {
  id: string;
  attributes: ImportConfigSavedObjectAttributes;
  version?: string;
  references: SavedObjectReference[];
}

export interface ImportConfigSavedObjectWriteResult {
  id: string;
  version?: string;
}

export interface FindImportConfigSavedObjectsParams {
  page: number;
  perPage: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  /** Only returns import configs whose saved object references this connector. */
  connectorId?: string;
}

export interface FindImportConfigSavedObjectsResult {
  saved_objects: ImportConfigSavedObjectDoc[];
  total: number;
}

export interface ImportConfigSavedObjectServiceContract {
  create(params: {
    attrs: ImportConfigSavedObjectAttributes;
    references: SavedObjectReference[];
    id?: string;
  }): Promise<ImportConfigSavedObjectWriteResult>;
  get(id: string, spaceId?: string): Promise<ImportConfigSavedObjectDoc>;
  update(params: {
    id: string;
    attrs: ImportConfigSavedObjectAttributes;
    references: SavedObjectReference[];
    version?: string;
  }): Promise<ImportConfigSavedObjectWriteResult>;
  delete(params: { id: string }): Promise<void>;
  find(params: FindImportConfigSavedObjectsParams): Promise<FindImportConfigSavedObjectsResult>;
}
