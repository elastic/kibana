/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectError } from '@kbn/core/types';
import type { KueryNode } from '@kbn/es-query';
import type { ActionPolicySavedObjectAttributes } from '../../../saved_objects';

export type ActionPolicySavedObjectBulkGetItem =
  | {
      id: string;
      attributes: ActionPolicySavedObjectAttributes;
      version?: string;
      namespaces?: string[];
    }
  | {
      id: string;
      error: SavedObjectError;
    };

export type ActionPolicySavedObjectBulkUpdateItem =
  | { id: string; version?: string }
  | { id: string; error: SavedObjectError };

export type ActionPolicySavedObjectBulkDeleteItem =
  | { id: string }
  | { id: string; error: SavedObjectError };

export interface ActionPolicySavedObjectServiceContract {
  create(params: {
    attrs: ActionPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: ActionPolicySavedObjectAttributes; version?: string }>;
  bulkGetByIds(ids: string[], spaceId?: string): Promise<ActionPolicySavedObjectBulkGetItem[]>;
  update(params: {
    id: string;
    attrs: Partial<ActionPolicySavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }>;
  bulkUpdate(params: {
    objects: Array<{
      id: string;
      attrs: Partial<ActionPolicySavedObjectAttributes>;
    }>;
  }): Promise<ActionPolicySavedObjectBulkUpdateItem[]>;
  findAllDecrypted(params?: {
    filter?: { enabled: boolean };
  }): Promise<ActionPolicySavedObjectBulkGetItem[]>;
  delete(params: { id: string }): Promise<void>;
  bulkDelete(params: { ids: string[] }): Promise<ActionPolicySavedObjectBulkDeleteItem[]>;
  find(params: {
    page: number;
    perPage: number;
    search?: string;
    filter?: KueryNode;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    saved_objects: Array<{
      id: string;
      attributes: ActionPolicySavedObjectAttributes;
      version?: string;
    }>;
    total: number;
  }>;
  getDistinctTags(params?: { search?: string }): Promise<string[]>;
}
