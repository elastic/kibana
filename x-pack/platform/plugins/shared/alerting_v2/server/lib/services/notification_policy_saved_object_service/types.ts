/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectError } from '@kbn/core/types';
import type { KueryNode } from '@kbn/es-query';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';

export type NotificationPolicySavedObjectBulkGetItem =
  | {
      id: string;
      attributes: NotificationPolicySavedObjectAttributes;
      version?: string;
      namespaces?: string[];
    }
  | {
      id: string;
      error: SavedObjectError;
    };

export type NotificationPolicySavedObjectBulkUpdateItem =
  | { id: string; version?: string }
  | { id: string; error: SavedObjectError };

export type NotificationPolicySavedObjectBulkDeleteItem =
  | { id: string }
  | { id: string; error: SavedObjectError };

export interface NotificationPolicySavedObjectServiceContract {
  create(params: {
    attrs: NotificationPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: NotificationPolicySavedObjectAttributes; version?: string }>;
  bulkGetByIds(
    ids: string[],
    spaceId?: string
  ): Promise<NotificationPolicySavedObjectBulkGetItem[]>;
  update(params: {
    id: string;
    attrs: Partial<NotificationPolicySavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }>;
  bulkUpdate(params: {
    objects: Array<{
      id: string;
      attrs: Partial<NotificationPolicySavedObjectAttributes>;
    }>;
  }): Promise<NotificationPolicySavedObjectBulkUpdateItem[]>;
  findAllDecrypted(params?: {
    filter?: { enabled: boolean };
  }): Promise<NotificationPolicySavedObjectBulkGetItem[]>;
  delete(params: { id: string }): Promise<void>;
  bulkDelete(params: { ids: string[] }): Promise<NotificationPolicySavedObjectBulkDeleteItem[]>;
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
      attributes: NotificationPolicySavedObjectAttributes;
      version?: string;
    }>;
    total: number;
  }>;
  getDistinctTags(params?: { search?: string }): Promise<string[]>;
}
