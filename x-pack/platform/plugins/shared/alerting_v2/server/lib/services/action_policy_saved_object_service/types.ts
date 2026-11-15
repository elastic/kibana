/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectError } from '@kbn/core/types';
import type {
  ActionPolicySavedObjectAttributes,
  PartiallyUpdateableActionPolicyAttributes,
} from '../../../saved_objects';

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

/** The subset of an action policy needed to attribute it to the routing tags it matches on. */
export interface ActionPolicyRoutingTagSource {
  id: string;
  name: string;
  enabled: boolean;
  matcher?: ActionPolicySavedObjectAttributes['matcher'];
}

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
    attrs: ActionPolicySavedObjectAttributes;
    version?: string;
  }): Promise<{ id: string; version?: string }>;
  /** Writes server-owned flat fields onto the stored document, preserving everything else. */
  patchFields(params: {
    id: string;
    attrs: PartiallyUpdateableActionPolicyAttributes;
  }): Promise<{ id: string; version?: string }>;
  bulkUpdate(params: {
    objects: Array<{
      id: string;
      attrs: PartiallyUpdateableActionPolicyAttributes;
    }>;
  }): Promise<ActionPolicySavedObjectBulkUpdateItem[]>;
  findAllDecrypted(params?: {
    filter?: { enabled: boolean };
  }): Promise<ActionPolicySavedObjectBulkGetItem[]>;
  /**
   * Reads the current space's action policies, up to `maxPolicies`, fetching only the fields
   * needed to group them by routing tag. `isTruncated` is true when more policies exist.
   */
  findRoutingTagSources(params: { maxPolicies: number }): Promise<{
    policies: ActionPolicyRoutingTagSource[];
    isTruncated: boolean;
  }>;
  delete(params: { id: string }): Promise<void>;
  bulkDelete(params: { ids: string[] }): Promise<ActionPolicySavedObjectBulkDeleteItem[]>;
  find(params: {
    page: number;
    perPage: number;
    search?: string;
    filter?: string;
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
}
