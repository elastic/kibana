/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { ExternalSourceSavedObjectAttributes } from '../../../saved_objects';

export interface ExternalSourceSavedObjectDoc {
  id: string;
  attributes: ExternalSourceSavedObjectAttributes;
  version?: string;
  references: SavedObjectReference[];
}

export interface ExternalSourceSavedObjectWriteResult {
  id: string;
  version?: string;
}

export interface FindExternalSourceSavedObjectsParams {
  page: number;
  perPage: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  /** Only returns external sources whose saved object references this connector. */
  connectorId?: string;
  /** Only returns external sources with this `type` attribute. */
  type?: string;
}

export interface FindExternalSourceSavedObjectsResult {
  saved_objects: ExternalSourceSavedObjectDoc[];
  total: number;
}

export interface ExternalSourceSavedObjectServiceContract {
  create(params: {
    attrs: ExternalSourceSavedObjectAttributes;
    references: SavedObjectReference[];
    id?: string;
  }): Promise<ExternalSourceSavedObjectWriteResult>;
  get(id: string, spaceId?: string): Promise<ExternalSourceSavedObjectDoc>;
  update(params: {
    id: string;
    attrs: ExternalSourceSavedObjectAttributes;
    references: SavedObjectReference[];
    version?: string;
  }): Promise<ExternalSourceSavedObjectWriteResult>;
  delete(params: { id: string }): Promise<void>;
  find(params: FindExternalSourceSavedObjectsParams): Promise<FindExternalSourceSavedObjectsResult>;
}
